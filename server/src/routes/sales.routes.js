/**
 * ============================================
 * Sales Routes
 * ============================================
 */

const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');
const { 
  Sale, SaleItem, Customer, Invoice, 
  SeedlingBatch, InventoryItem, User, Crop 
} = require('../models');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Get all sales
router.get('/', authenticate, hasPermission('sales', 'view'), asyncHandler(async (req, res) => {
  const { 
    page = 1, limit = 20, status, payment_status,
    from_date, to_date, customer_id, search 
  } = req.query;
  
  const where = {};
  
  if (status) where.status = status;
  if (payment_status) where.payment_status = payment_status;
  if (customer_id) where.customer_id = customer_id;
  
  if (from_date) {
    where.sale_date = { ...where.sale_date, [Op.gte]: from_date };
  }
  if (to_date) {
    where.sale_date = { ...where.sale_date, [Op.lte]: to_date };
  }
  
  if (search) {
    where[Op.or] = [
      { sale_number: { [Op.iLike]: `%${search}%` } },
      { customer_name: { [Op.iLike]: `%${search}%` } }
    ];
  }
  
  const sales = await Sale.findAndCountAll({
    where,
    include: [
      { model: Customer, as: 'customer', attributes: ['id', 'name', 'customer_code'] },
      { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] },
      { model: SaleItem, as: 'items', attributes: ['id'] }
    ],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
    order: [['sale_date', 'DESC'], ['created_at', 'DESC']],
    distinct: true
  });
  
  res.json({
    success: true,
    data: sales.rows,
    pagination: {
      total: sales.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(sales.count / parseInt(limit))
    }
  });
}));

// Get sales summary
router.get('/summary', authenticate, asyncHandler(async (req, res) => {
  const { from_date, to_date } = req.query;
  
  const where = { status: { [Op.ne]: 'cancelled' } };
  
  if (from_date) where.sale_date = { ...where.sale_date, [Op.gte]: from_date };
  if (to_date) where.sale_date = { ...where.sale_date, [Op.lte]: to_date };
  
  const totalSales = await Sale.sum('total_amount', { where });
  const totalCount = await Sale.count({ where });
  const unpaidAmount = await Sale.sum('balance_due', { 
    where: { ...where, payment_status: { [Op.in]: ['pending', 'partial'] } }
  });
  
  // Today's sales
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = await Sale.sum('total_amount', {
    where: { ...where, sale_date: today }
  });
  
  res.json({
    success: true,
    data: {
      totalSales: totalSales || 0,
      totalCount,
      unpaidAmount: unpaidAmount || 0,
      todaySales: todaySales || 0
    }
  });
}));

// Get single sale
router.get('/:id', authenticate, hasPermission('sales', 'view'), asyncHandler(async (req, res) => {
  const sale = await Sale.findByPk(req.params.id, {
    include: [
      { model: Customer, as: 'customer' },
      { 
        model: SaleItem, 
        as: 'items',
        include: [
          { model: InventoryItem, as: 'product', attributes: ['id', 'name', 'code'] },
          { 
            model: SeedlingBatch, 
            as: 'batch', 
            attributes: ['id', 'batch_number', 'crop_id'],
            include: [{ model: Crop, as: 'crop', attributes: ['id', 'name', 'code'] }]
          }
        ]
      },
      { model: Invoice, as: 'invoice' },
      { model: User, as: 'creator', attributes: ['id', 'first_name', 'last_name'] }
    ]
  });
  
  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }
  
  res.json({ success: true, data: sale });
}));

// Create sale
router.post('/', authenticate, hasPermission('sales', 'create'), asyncHandler(async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      customer_id, customer_name, customer_phone, sale_date,
      items, discount_percent, payment_method,
      amount_paid, mpesa_receipt, bank_reference, notes, client_id
    } = req.body;
    
    if (!items || items.length === 0) {
      await transaction.rollback();
      throw ApiError.badRequest('Sale must have at least one item');
    }
    
    // Generate sale number explicitly
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const saleCount = await Sale.count({ transaction });
    const sale_number = `SL-${dateStr}-${(saleCount + 1).toString().padStart(4, '0')}`;
    
    // Get customer if provided
    let customer = null;
    const customerId = customer_id && customer_id !== '' ? customer_id : null;
    console.log('Sale creation - customer_id from request:', customer_id, '-> customerId:', customerId);
    if (customerId) {
      customer = await Customer.findByPk(customerId, { transaction });
      console.log('Customer found:', customer ? `${customer.name} (${customer.id})` : 'NOT FOUND');
    }
    
    // Process items and fetch batch/product details
    let subtotal = 0;
    let taxAmount = 0;
    const processedItems = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Support both seedling_batch_id and batch_id
      const batchId = item.seedling_batch_id || item.batch_id;
      const productId = item.product_id;
      
      // Validate that at least one item reference exists
      if (!batchId && !productId) {
        await transaction.rollback();
        throw ApiError.badRequest(`Item ${i + 1}: Please select a batch or product`);
      }
      
      // Validate quantity
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        await transaction.rollback();
        throw ApiError.badRequest(`Item ${i + 1}: Quantity must be greater than 0`);
      }
      
      let itemName = item.item_name || 'Unknown Item';
      let itemCode = item.item_code || '';
      let itemType = item.item_type || 'seedling';
      
      // Fetch batch details if batch_id provided
      if (batchId) {
        const batch = await SeedlingBatch.findByPk(batchId, {
          include: [{ model: Crop, as: 'crop' }],
          transaction
        });
        if (!batch) {
          await transaction.rollback();
          throw ApiError.badRequest(`Item ${i + 1}: Batch not found`);
        }
        itemName = batch.crop?.name || `Batch ${batch.batch_number}`;
        itemCode = batch.batch_number;
        itemType = 'seedling';
        
        // Check available quantity
        if (parseFloat(item.quantity) > parseFloat(batch.current_quantity)) {
          await transaction.rollback();
          throw ApiError.badRequest(`Insufficient quantity for ${itemName}. Available: ${batch.current_quantity}`);
        }
      } else if (productId) {
        const product = await InventoryItem.findByPk(productId, { transaction });
        if (product) {
          itemName = product.name;
          itemCode = product.code;
          itemType = 'product';
        }
      }
      
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const itemSubtotal = quantity * unitPrice;
      const itemDiscount = item.discount_percent 
        ? itemSubtotal * item.discount_percent / 100 
        : 0;
      const taxableAmount = itemSubtotal - itemDiscount;
      const vatRate = item.vat_rate || 16;
      const itemTax = !item.is_vat_exempt 
        ? taxableAmount * vatRate / 100 
        : 0;
      
      subtotal += taxableAmount;
      taxAmount += itemTax;
      
      processedItems.push({
        item_type: itemType,
        batch_id: batchId || null,
        product_id: productId || null,
        item_code: itemCode,
        item_name: itemName,
        quantity,
        unit: item.unit || 'pcs',
        unit_price: unitPrice,
        discount_percent: item.discount_percent || 0,
        discount_amount: itemDiscount,
        vat_rate: vatRate,
        vat_amount: itemTax,
        is_vat_exempt: item.is_vat_exempt || false,
        line_number: i + 1,
        subtotal: taxableAmount,
        total: taxableAmount + itemTax
      });
    }
    
    const discountAmount = discount_percent ? subtotal * discount_percent / 100 : 0;
    const totalAmount = subtotal - discountAmount + taxAmount;
    const balanceDue = totalAmount - (parseFloat(amount_paid) || 0);
    
    // Create sale
    const sale = await Sale.create({
      sale_number,
      sale_date: sale_date || new Date(),
      customer_id: customerId,
      customer_name: customer_name || customer?.name || 'Walk-in Customer',
      customer_phone: customer_phone || customer?.phone,
      subtotal,
      discount_percent: discount_percent || 0,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      payment_method: payment_method || 'cash',
      amount_paid: parseFloat(amount_paid) || 0,
      balance_due: balanceDue,
      payment_status: balanceDue <= 0 ? 'paid' : (amount_paid > 0 ? 'partial' : 'pending'),
      mpesa_receipt,
      bank_reference,
      notes,
      created_by: req.userId,
      client_id,
      status: 'confirmed'
    }, { transaction });
    
    // Create sale items
    for (const item of processedItems) {
      await SaleItem.create({
        sale_id: sale.id,
        ...item
      }, { transaction });
      
      // Update stock/batch quantity
      if (item.item_type === 'seedling' && item.batch_id) {
        const batch = await SeedlingBatch.findByPk(item.batch_id, { transaction });
        if (batch) {
          await batch.update({
            sold_quantity: (batch.sold_quantity || 0) + item.quantity,
            current_quantity: batch.current_quantity - item.quantity
          }, { transaction });
        }
      } else if (item.item_type === 'product' && item.product_id) {
        const product = await InventoryItem.findByPk(item.product_id, { transaction });
        if (product) {
          await product.update({
            current_quantity: product.current_quantity - item.quantity
          }, { transaction });
        }
      }
    }
    
    // Update customer stats
    if (customerId && customer) {
      const newTotalPurchases = parseFloat(customer.total_purchases || 0) + totalAmount;
      const newPurchaseCount = parseInt(customer.purchase_count || 0) + 1;
      const newBalance = parseFloat(customer.current_balance || 0) + balanceDue;
      
      console.log('Updating customer stats:', {
        customerId: customer.id,
        customerName: customer.name,
        saleTotal: totalAmount,
        saleBalance: balanceDue,
        previousTotal: customer.total_purchases,
        previousBalance: customer.current_balance,
        newTotal: newTotalPurchases,
        newBalance: newBalance
      });
      
      await Customer.update({
        total_purchases: newTotalPurchases,
        purchase_count: newPurchaseCount,
        last_purchase_date: new Date(),
        current_balance: newBalance
      }, { 
        where: { id: customerId },
        transaction 
      });
      
      console.log('Customer stats updated successfully');
    } else {
      console.log('No customer to update - customerId:', customerId, 'customer:', customer ? 'found' : 'not found');
    }
    
    await transaction.commit();
    
    // Reload with associations
    await sale.reload({
      include: [
        { model: Customer, as: 'customer' },
        { model: SaleItem, as: 'items' }
      ]
    });
    
    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: sale
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('Sale creation error:', error.name, error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors.map(e => ({ field: e.path, message: e.message })));
    }
    throw error;
  }
}));

// Record payment
router.post('/:id/payment', authenticate, hasPermission('sales', 'edit'), asyncHandler(async (req, res) => {
  const { amount, payment_method, reference, notes } = req.body;
  
  const sale = await Sale.findByPk(req.params.id, {
    include: [{ model: Customer, as: 'customer' }]
  });
  
  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }
  
  if (sale.status === 'cancelled') {
    throw ApiError.badRequest('Cannot pay for cancelled sale');
  }
  
  const paymentAmount = parseFloat(amount);
  const newAmountPaid = parseFloat(sale.amount_paid) + paymentAmount;
  const newBalance = parseFloat(sale.total_amount) - newAmountPaid;
  
  await sale.update({
    amount_paid: newAmountPaid,
    balance_due: newBalance,
    payment_status: newBalance <= 0 ? 'paid' : 'partial',
    payment_method: sale.payment_method === 'mixed' || sale.payment_method !== payment_method 
      ? 'mixed' 
      : payment_method,
    ...(payment_method === 'mpesa' && { mpesa_receipt: reference }),
    ...(payment_method === 'bank_transfer' && { bank_reference: reference })
  });
  
  // Update customer balance if customer exists
  if (sale.customer) {
    await sale.customer.update({
      current_balance: Math.max(0, parseFloat(sale.customer.current_balance || 0) - paymentAmount)
    });
  }
  
  res.json({
    success: true,
    message: 'Payment recorded',
    data: sale
  });
}));

// Change sale status
router.patch('/:id/status', authenticate, hasPermission('sales', 'edit'), asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  const validStatuses = ['draft', 'confirmed', 'completed', 'cancelled'];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest('Invalid status');
  }
  
  const sale = await Sale.findByPk(req.params.id, {
    include: [{ model: Customer, as: 'customer' }]
  });
  
  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }
  
  // Validation rules
  if (sale.status === 'cancelled') {
    throw ApiError.badRequest('Cannot change status of a cancelled sale');
  }
  
  if (status === 'completed' && sale.payment_status !== 'paid') {
    throw ApiError.badRequest('Cannot complete sale with pending payment');
  }
  
  await sale.update({ status });
  
  res.json({
    success: true,
    message: `Sale status changed to ${status}`,
    data: sale
  });
}));

// Void sale
router.post('/:id/void', authenticate, hasPermission('sales', 'void'), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  
  const sale = await Sale.findByPk(req.params.id, {
    include: [{ model: SaleItem, as: 'items' }]
  });
  
  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }
  
  if (sale.status === 'voided') {
    throw ApiError.badRequest('Sale already voided');
  }
  
  if (sale.etims_submitted) {
    throw ApiError.badRequest('Cannot void sale already submitted to eTIMS. Create a credit note instead.');
  }
  
  const transaction = await sequelize.transaction();
  
  try {
    // Restore stock
    for (const item of sale.items) {
      if (item.item_type === 'seedling' && item.batch_id) {
        const batch = await SeedlingBatch.findByPk(item.batch_id, { transaction });
        if (batch) {
          await batch.update({
            sold_quantity: batch.sold_quantity - item.quantity,
            current_quantity: batch.current_quantity + item.quantity
          }, { transaction });
        }
      } else if (item.item_type === 'product' && item.product_id) {
        const product = await InventoryItem.findByPk(item.product_id, { transaction });
        if (product) {
          await product.update({
            current_quantity: product.current_quantity + item.quantity
          }, { transaction });
        }
      }
    }
    
    await sale.update({
      status: 'voided',
      void_reason: reason,
      voided_by: req.userId,
      voided_at: new Date()
    }, { transaction });
    
    // Reverse customer stats if customer exists
    if (sale.customer_id) {
      const customer = await Customer.findByPk(sale.customer_id, { transaction });
      if (customer) {
        await Customer.update({
          total_purchases: Math.max(0, parseFloat(customer.total_purchases || 0) - parseFloat(sale.total_amount)),
          purchase_count: Math.max(0, (customer.purchase_count || 0) - 1),
          current_balance: Math.max(0, parseFloat(customer.current_balance || 0) - parseFloat(sale.balance_due))
        }, { 
          where: { id: sale.customer_id },
          transaction 
        });
      }
    }
    
    await transaction.commit();
    
    res.json({
      success: true,
      message: 'Sale voided successfully',
      data: sale
    });
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}));

// Submit to eTIMS
router.post('/:id/submit-etims', authenticate, hasPermission('sales', 'create'), asyncHandler(async (req, res) => {
  const sale = await Sale.findByPk(req.params.id, {
    include: [
      { model: Customer, as: 'customer' },
      { model: SaleItem, as: 'items' }
    ]
  });
  
  if (!sale) {
    throw ApiError.notFound('Sale not found');
  }
  
  if (sale.etims_submitted) {
    throw ApiError.badRequest('Sale already submitted to eTIMS');
  }
  
  // TODO: Implement actual eTIMS API call
  // This is a placeholder - actual implementation requires KRA eTIMS API integration
  
  // For now, mark as submitted (simulate success)
  await sale.update({
    etims_submitted: true,
    etims_submitted_at: new Date(),
    etims_invoice_number: `ETIMS-${sale.sale_number}`,
    etims_cu_number: `CU${Date.now()}`,
    etims_response: { status: 'success', message: 'Submitted successfully' }
  });
  
  res.json({
    success: true,
    message: 'Sale submitted to eTIMS',
    data: sale
  });
}));

module.exports = router;

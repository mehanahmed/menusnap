'use server';

import pool from '@/lib/mysql';
import { revalidatePath } from 'next/cache';

export interface CustomerOrderItem {
  key: string;
  name: string;
  variationName?: string;
  price: number;
  quantity: number;
}

export interface CustomerOrderRecord {
  id: number;
  orderId: string;
  clientId: number | null;
  businessName: string;
  draftId: string | null;
  customerName: string;
  customerPhone: string;
  tableNumber: string | null;
  specialNote: string | null;
  items: CustomerOrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface CreateCustomerOrderInput {
  orderId?: string;
  clientId?: number | null;
  businessName: string;
  draftId?: string | null;
  customerName: string;
  customerPhone: string;
  tableNumber?: string | null;
  specialNote?: string | null;
  items: CustomerOrderItem[];
  totalAmount: number;
}

let tableSchemaInitialized = false;

/**
 * Ensures customer_orders table exists in MySQL with optimal indexes
 */
export async function ensureCustomerOrdersSchema() {
  if (tableSchemaInitialized) return;
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customer_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(50) NOT NULL UNIQUE,
        client_id INT NULL,
        business_name VARCHAR(255) NOT NULL,
        draft_id VARCHAR(100) NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        table_number VARCHAR(50) NULL,
        special_note TEXT NULL,
        items_json LONGTEXT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_client_id (client_id),
        INDEX idx_business_name (business_name),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    tableSchemaInitialized = true;
  } catch (error) {
    console.error('Failed to initialize customer_orders schema:', error);
  }
}

/**
 * Creates a new customer order submitted via digital QR menu
 */
export async function createCustomerOrderAction(
  input: CreateCustomerOrderInput
): Promise<{ success: boolean; error?: string; orderId?: string }> {
  try {
    await ensureCustomerOrdersSchema();

    const orderId = input.orderId || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const customerName = (input.customerName || 'Anonymous').trim();
    const customerPhone = (input.customerPhone || '').trim();
    const tableNumber = input.tableNumber ? String(input.tableNumber).trim() : null;
    const specialNote = input.specialNote ? String(input.specialNote).trim() : null;
    const draftId = input.draftId ? String(input.draftId).trim() : null;
    let clientId = typeof input.clientId === 'number' ? input.clientId : null;
    let businessName = (input.businessName || 'Restaurant').trim();

    // Auto-resolve clientId and businessName from draft if missing (e.g. customer ordered from QR)
    if (!clientId && draftId) {
      try {
        const [draftRows]: any = await pool.execute(
          'SELECT client_id, business_name FROM user_drafts WHERE draft_id = ? LIMIT 1',
          [draftId]
        );
        if (draftRows && draftRows.length > 0) {
          if (draftRows[0].client_id) {
            clientId = Number(draftRows[0].client_id);
          }
          if (draftRows[0].business_name && (!input.businessName || input.businessName === 'Restaurant')) {
            businessName = draftRows[0].business_name;
          }
        }
      } catch (err) {
        console.warn('[createCustomerOrderAction] Failed to resolve client from draft:', err);
      }
    }
    const totalAmount = Number(input.totalAmount) || 0;
    const itemsJson = JSON.stringify(input.items || []);

    await pool.execute(
      `INSERT INTO customer_orders 
        (order_id, client_id, business_name, draft_id, customer_name, customer_phone, table_number, special_note, items_json, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        orderId,
        clientId,
        businessName,
        draftId,
        customerName,
        customerPhone,
        tableNumber,
        specialNote,
        itemsJson,
        totalAmount,
      ]
    );

    revalidatePath('/draft');
    return { success: true, orderId };
  } catch (error: any) {
    console.error('Error in createCustomerOrderAction:', error);
    return { success: false, error: error.message || 'Failed to record customer order' };
  }
}

/**
 * Retrieves customer orders filtered by client_id and/or business_name
 */
export async function getCustomerOrdersAction(params: {
  clientId?: number | null;
  businessName?: string | null;
  status?: string | null;
  search?: string | null;
  isAdmin?: boolean;
}): Promise<{ success: boolean; orders: CustomerOrderRecord[]; error?: string }> {
  try {
    await ensureCustomerOrdersSchema();

    // Strict multi-tenant isolation: A non-admin query MUST provide clientId or businessName
    if (!params.isAdmin && !params.clientId && !params.businessName) {
      return { success: true, orders: [] };
    }

    let query = `
      SELECT id, order_id, client_id, business_name, draft_id, customer_name, customer_phone, 
             table_number, special_note, items_json, total_amount, status,
             DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
      FROM customer_orders
      WHERE 1=1
    `;
    const queryParams: any[] = [];

    // Strict multi-tenant isolation: If clientId is provided, it is 100% authoritative (never match by business_name)
    if (params.clientId) {
      query += ` AND client_id = ?`;
      queryParams.push(params.clientId);
    } else if (params.businessName) {
      query += ` AND business_name = ?`;
      queryParams.push(params.businessName.trim());
    }

    // Filter by status
    if (params.status && params.status !== 'all') {
      query += ` AND status = ?`;
      queryParams.push(params.status.toLowerCase());
    }

    // Search query across name, phone, order_id, table
    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      query += ` AND (order_id LIKE ? OR customer_name LIKE ? OR customer_phone LIKE ? OR table_number LIKE ?)`;
      queryParams.push(term, term, term, term);
    }

    query += ` ORDER BY created_at DESC LIMIT 200`;

    const [rows]: any = await pool.execute(query, queryParams);

    const orders: CustomerOrderRecord[] = (Array.isArray(rows) ? rows : []).map((row: any) => {
      let items: CustomerOrderItem[] = [];
      try {
        items = typeof row.items_json === 'string' ? JSON.parse(row.items_json) : (row.items_json || []);
      } catch {
        items = [];
      }

      return {
        id: row.id,
        orderId: row.order_id,
        clientId: row.client_id,
        businessName: row.business_name,
        draftId: row.draft_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        tableNumber: row.table_number,
        specialNote: row.special_note,
        items,
        totalAmount: Number(row.total_amount) || 0,
        status: (row.status || 'pending').toLowerCase() as any,
        createdAt: row.created_at,
      };
    });

    return { success: true, orders };
  } catch (error: any) {
    console.error('Error in getCustomerOrdersAction:', error);
    return { success: false, orders: [], error: error.message || 'Failed to fetch customer orders' };
  }
}

/**
 * Updates the status of an existing customer order and syncs with accounts incomes
 */
export async function updateCustomerOrderStatusAction(
  orderId: string,
  newStatus: 'pending' | 'preparing' | 'completed' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureCustomerOrdersSchema();

    await pool.execute(
      `UPDATE customer_orders SET status = ? WHERE order_id = ?`,
      [newStatus.toLowerCase(), orderId]
    );

    // Auto-sync with Accounts Incomes
    try {
      if (newStatus.toLowerCase() === 'completed') {
        const [orderRows]: any = await pool.execute(
          `SELECT order_id, client_id, business_name, customer_name, customer_phone, table_number, special_note, total_amount, created_at
           FROM customer_orders
           WHERE order_id = ?
           LIMIT 1`,
          [orderId]
        );

        if (orderRows && orderRows.length > 0) {
          const ord = orderRows[0];
          let restaurantId = ord.client_id ? String(ord.client_id) : '';
          if (!restaurantId && ord.business_name) {
            const [clientRows]: any = await pool.execute(
              `SELECT id FROM clients WHERE business_name = ? LIMIT 1`,
              [ord.business_name]
            );
            if (clientRows && clientRows.length > 0) {
              restaurantId = String(clientRows[0].id);
            }
          }
          if (!restaurantId) {
            restaurantId = ord.business_name || '1';
          }

          const orderDate = ord.created_at
            ? new Date(ord.created_at).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
          const tableInfo = ord.table_number ? ` (Table ${ord.table_number})` : '';
          const custName = ((ord.customer_name || 'Customer') + tableInfo).slice(0, 150);
          const custPhone = ord.customer_phone ? String(ord.customer_phone).trim() : null;
          const noteText = ord.special_note ? String(ord.special_note).trim() : null;

          // Check if an income row already exists for this order
          const [existingRows]: any = await pool.execute(
            `SELECT id, deleted_at FROM incomes WHERE order_id = ? LIMIT 1`,
            [ord.order_id]
          );

          if (existingRows && existingRows.length > 0) {
            // Restore if soft-deleted, and update amount, date, phone
            await pool.execute(
              `UPDATE incomes 
               SET deleted_at = NULL, amount = ?, date = ?, customer_name = ?, customer_phone = ?, note = ?, updated_at = NOW() 
               WHERE id = ?`,
              [Number(ord.total_amount) || 0, orderDate, custName, custPhone, noteText, existingRows[0].id]
            );
          } else {
            // Insert new income row with dedicated customer_phone
            await pool.execute(
              `INSERT INTO incomes (
                restaurant_id,
                date,
                amount,
                payment_method_id,
                customer_name,
                customer_phone,
                order_id,
                created_by,
                note
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                restaurantId,
                orderDate,
                Number(ord.total_amount) || 0,
                1, // 1 = Cash
                custName,
                custPhone,
                ord.order_id,
                'QR Order',
                noteText
              ]
            );
          }
        }
      } else {
        // If status changed away from completed (e.g. cancelled, pending, preparing), soft-delete linked income
        await pool.execute(
          `UPDATE incomes SET deleted_at = NOW() WHERE order_id = ? AND deleted_at IS NULL`,
          [orderId]
        );
      }
    } catch (syncErr) {
      console.warn('Completed order sync to accounts incomes error:', syncErr);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in updateCustomerOrderStatusAction:', error);
    return { success: false, error: error.message || 'Failed to update order status' };
  }
}

/**
 * Deletes an order from MySQL
 */
export async function deleteCustomerOrderAction(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureCustomerOrdersSchema();

    await pool.execute(`DELETE FROM customer_orders WHERE order_id = ?`, [orderId]);

    try {
      await pool.execute(`UPDATE incomes SET deleted_at = NOW() WHERE order_id = ? AND deleted_at IS NULL`, [orderId]);
    } catch {}

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteCustomerOrderAction:', error);
    return { success: false, error: error.message || 'Failed to delete order' };
  }
}

/**
 * Retrieves a single customer order by orderId for the public verification receipt
 */
export async function getCustomerOrderByIdAction(
  orderId: string
): Promise<{ success: boolean; order?: CustomerOrderRecord; error?: string }> {
  try {
    await ensureCustomerOrdersSchema();
    const cleanId = String(orderId || '').trim().replace(/\/+$/, '');
    if (!cleanId) return { success: false, error: 'Order ID is required' };

    const [rows]: any = await pool.execute(
      `SELECT id, order_id, client_id, business_name, draft_id, customer_name, customer_phone, 
              table_number, special_note, items_json, total_amount, status,
              DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') as created_at
       FROM customer_orders
       WHERE order_id = ?
       LIMIT 1`,
      [cleanId]
    );

    if (rows && rows.length > 0) {
      const row = rows[0];
      let items: CustomerOrderItem[] = [];
      try {
        items = typeof row.items_json === 'string' ? JSON.parse(row.items_json) : (row.items_json || []);
      } catch {
        items = [];
      }

      return {
        success: true,
        order: {
          id: row.id,
          orderId: row.order_id,
          clientId: row.client_id,
          businessName: row.business_name,
          draftId: row.draft_id,
          customerName: row.customer_name,
          customerPhone: row.customer_phone,
          tableNumber: row.table_number,
          specialNote: row.special_note,
          items,
          totalAmount: Number(row.total_amount) || 0,
          status: (row.status || 'pending').toLowerCase() as any,
          createdAt: row.created_at,
        },
      };
    }

    // 2. Fallback: Check incomes table for manual orders or direct receipts (e.g. ORD-M-XXXX)
    const [incRows]: any = await pool.execute(
      `SELECT i.id, i.restaurant_id, i.order_id, i.customer_name, i.customer_phone, 
              i.amount, i.note, i.created_by,
              DATE_FORMAT(i.created_at, '%Y-%m-%d %H:%i:%s') as created_at,
              c.business_name,
              s.name as service_name
       FROM incomes i
       LEFT JOIN clients c ON i.restaurant_id = c.id
       LEFT JOIN services s ON i.service_id = s.id
       WHERE (i.order_id = ? OR i.id = ?) AND i.deleted_at IS NULL
       LIMIT 1`,
      [cleanId, Number(cleanId) || -1]
    );

    if (incRows && incRows.length > 0) {
      const inc = incRows[0];

      let custName = inc.customer_name || 'Walk-in Customer';
      let tableNum: string | null = null;
      const tableMatch = String(custName).match(/\(Table\s+([^)]+)\)/i);
      if (tableMatch) {
        tableNum = tableMatch[1].trim();
        custName = custName.replace(/\(Table\s+[^)]+\)/i, '').trim();
      }

      const itemName = inc.service_name || inc.note || 'Food & Beverage Order';

      return {
        success: true,
        order: {
          id: inc.id,
          orderId: inc.order_id || `REC-${inc.id}`,
          clientId: Number(inc.restaurant_id) || null,
          businessName: inc.business_name || 'Restaurant',
          draftId: null,
          customerName: custName,
          customerPhone: inc.customer_phone || null,
          tableNumber: tableNum,
          specialNote: inc.note || null,
          items: [
            {
              key: 'item-1',
              name: itemName,
              quantity: 1,
              price: Number(inc.amount) || 0,
            },
          ],
          totalAmount: Number(inc.amount) || 0,
          status: 'completed',
          createdAt: inc.created_at,
        },
      };
    }

    return { success: false, error: 'Order not found' };
  } catch (error: any) {
    console.error('Error in getCustomerOrderByIdAction:', error);
    return { success: false, error: error.message || 'Failed to fetch order' };
  }
}


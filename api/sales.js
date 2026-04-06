import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const connectionString = process.env.POSTGRES_URL || "postgresql://neondb_owner:npg_XB3SU0AthRFV@ep-mute-math-amplqkgj-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
  const isLocal = request.headers.host && (request.headers.host.includes('localhost') || request.headers.host.includes('127.0.0.1'));
  const pool = createPool({ connectionString });
  
  const T_SALES = isLocal ? 'test_sales' : 'sales';
  const T_CUSTOMERS = isLocal ? 'test_customers' : 'customers';

  try {
    // 1. Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${T_SALES} (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        items JSONB NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        paid_amount DECIMAL(10, 2) DEFAULT 0,
        profit DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. GET
    if (request.method === 'GET') {
      const { rows } = await pool.query(`SELECT * FROM ${T_SALES} ORDER BY created_at DESC;`);
      return response.status(200).json(rows || []);
    }

    // 3. POST
    if (request.method === 'POST') {
      const { customer_id, items, total_amount, paid_amount, profit } = request.body;
      const { rows } = await pool.query(`
        INSERT INTO ${T_SALES} (customer_id, items, total_amount, paid_amount, profit)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `, [customer_id, JSON.stringify(items), total_amount, paid_amount, profit]);
      
      const newSale = rows[0];

      // Update customer balance if there is a difference between total and paid (Debt or Abono)
      if (customer_id && parseFloat(total_amount) !== parseFloat(paid_amount)) {
        const diff = parseFloat(total_amount) - parseFloat(paid_amount);
        await pool.query(`UPDATE ${T_CUSTOMERS} SET balance = balance + $1 WHERE id = $2;`, [diff, customer_id]);
      }
      
      return response.status(201).json(newSale);
    }

    // 4. PUT (Re-assign customer)
    if (request.method === 'PUT') {
      const { id, customer_id } = request.body;
      
      // 1. Get current sale to calculate balance adjustment
      const { rows: saleRows } = await pool.query(`SELECT * FROM ${T_SALES} WHERE id = $1;`, [id]);
      if (saleRows.length === 0) return response.status(404).json({ error: 'Sale not found' });
      
      const oldSale = saleRows[0];
      const oldCustomerId = oldSale.customer_id;
      const debt = parseFloat(oldSale.total_amount) - parseFloat(oldSale.paid_amount);

      // 2. Update sale customer_id
      await pool.query(`UPDATE ${T_SALES} SET customer_id = $1 WHERE id = $2;`, [customer_id, id]);

      // 3. Adjust old customer balance (subtract the debt)
      if (oldCustomerId && debt !== 0) {
        await pool.query(`UPDATE ${T_CUSTOMERS} SET balance = balance - $1 WHERE id = $2;`, [debt, oldCustomerId]);
      }

      // 4. Adjust new customer balance (add the debt)
      if (customer_id && debt !== 0) {
        await pool.query(`UPDATE ${T_CUSTOMERS} SET balance = balance + $1 WHERE id = $2;`, [debt, customer_id]);
      }

      return response.status(200).json({ message: 'Sale re-assigned and balances updated' });
    }

    return response.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error Postgres:', error.message);
    return response.status(500).json({ error: error.message });
  }
}

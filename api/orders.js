import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const connectionString = process.env.POSTGRES_URL || "postgresql://neondb_owner:npg_XB3SU0AthRFV@ep-mute-math-amplqkgj-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
  const isLocal = request.headers.host && (request.headers.host.includes('localhost') || request.headers.host.includes('127.0.0.1'));
  const pool = createPool({ connectionString });
  
  const T_ORDERS = isLocal ? 'test_perfume_orders' : 'perfume_orders';
  const T_DRAFT = isLocal ? 'test_perfume_draft_order' : 'perfume_draft_order';

  try {
    // 1. Crear tablas si no existen
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${T_ORDERS} (
        id SERIAL PRIMARY KEY,
        items JSONB NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        total_cost DECIMAL(10, 2) DEFAULT 0,
        total_profit DECIMAL(10, 2) DEFAULT 0,
        is_entered BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Asegurar columnas
    try { await pool.query(`ALTER TABLE ${T_ORDERS} ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10, 2) DEFAULT 0;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE ${T_ORDERS} ADD COLUMN IF NOT EXISTS total_profit DECIMAL(10, 2) DEFAULT 0;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE ${T_ORDERS} ADD COLUMN IF NOT EXISTS is_entered BOOLEAN DEFAULT FALSE;`); } catch(e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${T_DRAFT} (
        id INT PRIMARY KEY DEFAULT 1,
        items JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { type } = request.query;

    // 2. GET: Listar historial o Borrador
    if (request.method === 'GET') {
      if (type === 'draft') {
        const { rows } = await pool.query(`SELECT items FROM ${T_DRAFT} WHERE id = 1;`);
        return response.status(200).json(rows[0]?.items || []);
      }
      const { rows } = await pool.query(`SELECT * FROM ${T_ORDERS} ORDER BY created_at DESC;`);
      return response.status(200).json(rows || []);
    }

    // 3. POST: Guardar nuevo pedido o Borrador
    if (request.method === 'POST') {
      const { items, total_price, total_cost, total_profit, is_entered } = request.body;
      
      if (type === 'draft') {
        await pool.query(`
          INSERT INTO ${T_DRAFT} (id, items, updated_at)
          VALUES (1, $1, CURRENT_TIMESTAMP)
          ON CONFLICT (id) DO UPDATE SET items = EXCLUDED.items, updated_at = CURRENT_TIMESTAMP;
        `, [JSON.stringify(items)]);
        return response.status(200).json({ message: 'Borrador guardado' });
      }

      const { rows } = await pool.query(`
        INSERT INTO ${T_ORDERS} (items, total_price, total_cost, total_profit, is_entered)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
      `, [JSON.stringify(items), total_price, total_cost || 0, total_profit || 0, is_entered || false]);
      
      await pool.query(`UPDATE ${T_DRAFT} SET items = '[]' WHERE id = 1;`);
      return response.status(201).json(rows[0]);
    }

    // 4. PUT: Actualizar un pedido
    if (request.method === 'PUT') {
      const { id, items, total_price, total_cost, total_profit, is_entered } = request.body;
      await pool.query(`
        UPDATE ${T_ORDERS} 
        SET items = $1, total_price = $2, total_cost = $3, total_profit = $4, is_entered = $5
        WHERE id = $6;
      `, [JSON.stringify(items), total_price, total_cost, total_profit, is_entered || false, id]);
      return response.status(200).json({ message: 'Pedido actualizado' });
    }

    // 5. DELETE
    if (request.method === 'DELETE') {
      const { id } = request.query;
      await pool.query(`DELETE FROM ${T_ORDERS} WHERE id = $1;`, [id]);
      return response.status(200).json({ message: 'Pedido eliminado' });
    }

    return response.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error Postgres:', error.message);
    return response.status(500).json({ error: error.message });
  }
}

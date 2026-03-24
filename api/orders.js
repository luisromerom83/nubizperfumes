import { createPool } from '@vercel/postgres';

export default async function handler(request, response) {
  const connectionString = "postgresql://neondb_owner:npg_XB3SU0AthRFV@ep-mute-math-amplqkgj-pooler.c-5.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
  const pool = createPool({ connectionString });

  try {
    // 1. Crear tabla de historial de pedidos si no existe
    await pool.sql`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        items JSONB NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // LÍNEA TEMPORAL PARA BORRAR EL HISTORIAL UNA VEZ COMPLETA:
    // await pool.sql`DELETE FROM orders;`;

    // 2. GET: Listar historial
    if (request.method === 'GET') {
      const { rows } = await pool.sql`SELECT * FROM orders ORDER BY created_at DESC;`;
      return response.status(200).json(rows || []);
    }

    // 3. POST: Guardar nuevo pedido
    if (request.method === 'POST') {
      const { items, total_price } = request.body;
      const result = await pool.sql`
        INSERT INTO orders (items, total_price)
        VALUES (${JSON.stringify(items)}, ${total_price})
        RETURNING *;
      `;
      return response.status(201).json(result.rows[0]);
    }

    // 4. DELETE: Borrar pedido del historial
    if (request.method === 'DELETE') {
      const { id } = request.query;
      await pool.sql`DELETE FROM orders WHERE id = ${id};`;
      return response.status(200).json({ message: 'Pedido eliminado' });
    }

    return response.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('Error Postgres:', error.message);
    return response.status(500).json({ error: error.message });
  }
}

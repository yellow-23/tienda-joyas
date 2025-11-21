// index.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { pool } from './db.js';
import { logger } from './middlewares/logger.js';
import { buildJoyasHateoas } from './utils/hateoas.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(logger); // middleware de reporte

// ----------------------
// GET /joyas (HATEOAS + límite + página + orden)
// ----------------------
app.get('/joyas', async (req, res) => {
  try {
    // query params
    const { limits = 10, page = 1, order_by = 'id_ASC' } = req.query;

    // validar y parsear order_by => campo + dirección
    const [campo, direccion] = order_by.split('_');
    const camposPermitidos = ['id', 'nombre', 'categoria', 'metal', 'precio', 'stock'];
    const direccionesPermitidas = ['ASC', 'DESC'];

    const campoOrder = camposPermitidos.includes(campo) ? campo : 'id';
    const dirOrder = direccionesPermitidas.includes(direccion) ? direccion : 'ASC';

    const limit = Number(limits) || 10;
    const offset = (Number(page) - 1) * limit;

    // total de joyas
    const { rows: totalRows } = await pool.query('SELECT COUNT(*) AS total FROM inventario');
    const totalJoyas = Number(totalRows[0].total);

    // consulta paginada y ordenada
    const query = `
      SELECT * FROM inventario
      ORDER BY ${campoOrder} ${dirOrder}
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await pool.query(query, [limit, offset]);

    const hateoas = buildJoyasHateoas(rows, totalJoyas);

    res.json(hateoas);
  } catch (error) {
    console.error('Error en GET /joyas:', error);
    res.status(500).json({ error: 'Error interno en la consulta de joyas' });
  }
});

// ----------------------
// GET /joyas/filtros
// ----------------------
app.get('/joyas', async (req, res, next) => {
  try {
    const { limits = 10, page = 1, order_by = 'id_ASC' } = req.query;

    const [campo, direccion] = (order_by || 'id_ASC').split('_');
    const camposPermitidos = ['id', 'nombre', 'categoria', 'metal', 'precio', 'stock'];
    const direccionesPermitidas = ['ASC', 'DESC'];

    const campoOrder = camposPermitidos.includes(campo) ? campo : 'id';
    const dirOrder = direccionesPermitidas.includes(direccion) ? direccion : 'ASC';

    const limit = Number(limits) || 10;
    const offset = (Number(page) - 1) * limit;

    // total joyas
    const { rows: totalRows } = await pool.query('SELECT COUNT(*) AS total FROM inventario');
    const totalJoyas = Number(totalRows[0].total);

    // stock total
    const { rows: stockRows } = await pool.query('SELECT COALESCE(SUM(stock), 0) AS stock_total FROM inventario');
    const stockTotal = Number(stockRows[0].stock_total);

    // consulta paginada y ordenada (con orden validado, sin SQL injection)
    const query = `
      SELECT * FROM inventario
      ORDER BY ${campoOrder} ${dirOrder}
      LIMIT $1 OFFSET $2
    `;
    const { rows } = await pool.query(query, [limit, offset]);

    const hateoas = buildJoyasHateoas(rows, { totalJoyas, stockTotal });

    res.json(hateoas);
  } catch (error) {
    next(error);
  }
});


// ----------------------
// Arrancar servidor
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

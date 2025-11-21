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
app.get('/joyas/filtros', async (req, res) => {
  try {
    const { precio_max, precio_min, categoria, metal } = req.query;

    // Construir consulta de forma segura (parametrizada)
    let baseQuery = 'SELECT * FROM inventario WHERE 1=1';
    const values = [];
    let index = 1;

    if (precio_min) {
      baseQuery += ` AND precio >= $${index}`;
      values.push(Number(precio_min));
      index++;
    }

    if (precio_max) {
      baseQuery += ` AND precio <= $${index}`;
      values.push(Number(precio_max));
      index++;
    }

    if (categoria) {
      baseQuery += ` AND categoria = $${index}`;
      values.push(categoria);
      index++;
    }

    if (metal) {
      baseQuery += ` AND metal = $${index}`;
      values.push(metal);
      index++;
    }

    const { rows } = await pool.query(baseQuery, values);

    res.json(rows);
  } catch (error) {
    console.error('Error en GET /joyas/filtros:', error);
    res.status(500).json({ error: 'Error interno en la consulta filtrada' });
  }
});

// ----------------------
// Arrancar servidor
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});

// middlewares/logger.js
export const logger = (req, res, next) => {
  const inicio = Date.now();

  res.on('finish', () => {
    const tiempo = Date.now() - inicio;
    const ahora = new Date().toISOString();
    const metodo = req.method;
    const ruta = req.originalUrl;
    const estado = res.statusCode;
    const ip = req.ip || req.connection?.remoteAddress;

    console.log(
      `[${ahora}] ${ip} ${metodo} ${ruta} → ${estado} (${tiempo} ms)`
    );
  });

  next();
};

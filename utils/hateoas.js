// utils/hateoas.js
export const buildJoyasHateoas = (joyas, { totalJoyas, stockTotal }) => {
  const results = joyas.map((j) => ({
    name: j.nombre,
    href: `/joyas/${j.id}`,
    categoria: j.categoria,
    metal: j.metal,
    precio: j.precio,
    stock: j.stock,
  }));

  return {
    totalJoyas,
    stockTotal,
    results,
  };
};

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', password: '' });
  const [newProduct, setNewProduct] = useState({
    name: '',
    size: '',
    price: '',
    image: null
  });

  useEffect(() => {
    const saved = localStorage.getItem('products');
    if (saved) setProducts(JSON.parse(saved));
    
    const auth = sessionStorage.getItem('isAdminAuthenticated');
    if (auth === 'true') setIsAuthenticated(true);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginData.user === 'admin' && loginData.password === 'Anitalavalatin4') {
      setIsAuthenticated(true);
      sessionStorage.setItem('isAdminAuthenticated', 'true');
    } else {
      alert('Credenciales incorrectas');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('isAdminAuthenticated');
  };

  const saveToLocal = (updated) => {
    setProducts(updated);
    localStorage.setItem('products', JSON.stringify(updated));
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newProduct.image) return alert('Por favor selecciona una imagen');
    
    const product = {
      ...newProduct,
      id: Date.now(),
      price: parseFloat(newProduct.price)
    };
    
    const updated = [...products, product];
    saveToLocal(updated);
    setNewProduct({ name: '', size: '', price: '', image: null });
    e.target.reset();
  };

  const deleteProduct = (id) => {
    const updated = products.filter(p => p.id !== id);
    saveToLocal(updated);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="glass" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
          <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>Acceso Administrativo</h2>
          <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.5rem' }}>
            <input 
              type="text" 
              placeholder="Usuario" 
              required 
              className="glass" 
              style={{ padding: '1rem', color: 'white' }}
              value={loginData.user}
              onChange={(e) => setLoginData({ ...loginData, user: e.target.value })}
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              required 
              className="glass" 
              style={{ padding: '1rem', color: 'white' }}
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            />
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Entrar
            </button>
          </form>
          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem' }}>Volver a la tienda</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1>Panel de Administración</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/" className="btn" style={{ background: 'var(--glass-bg)', color: 'white' }}>Ver Tienda</Link>
          <button onClick={handleLogout} className="btn btn-danger">Cerrar Sesión</button>
        </div>
      </header>

      <div className="glass" style={{ padding: '2rem', marginBottom: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem' }}>Agregar Nuevo Producto</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input 
              type="text" 
              placeholder="Nombre del Producto" 
              required 
              className="glass" 
              style={{ padding: '0.75rem', color: 'white' }}
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            />
            <input 
              type="text" 
              placeholder="Talla (S, M, L, XL...)" 
              required 
              className="glass" 
              style={{ padding: '0.75rem', color: 'white' }}
              value={newProduct.size}
              onChange={(e) => setNewProduct({...newProduct, size: e.target.value})}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <input 
              type="number" 
              placeholder="Precio ($)" 
              required 
              className="glass" 
              style={{ padding: '0.75rem', color: 'white' }}
              value={newProduct.price}
              onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
            />
            <input 
              type="file" 
              accept="image/*" 
              className="glass" 
              style={{ padding: '0.5rem', color: 'white' }}
              onChange={handleImage}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '200px' }}>
            Guardar Producto
          </button>
        </form>
      </div>

      <h2>Productos en Catálogo</h2>
      <div className="grid" style={{ marginTop: '1.5rem' }}>
        {products.map(product => (
          <div key={product.id} className="glass card">
            <img src={product.image} alt={product.name} className="product-img" />
            <div className="product-info">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="badge">{product.size}</span>
                <span className="price">${product.price}</span>
              </div>
              <h3 style={{ marginBottom: '1rem' }}>{product.name}</h3>
              <button 
                onClick={() => deleteProduct(product.id)}
                className="btn btn-danger"
                style={{ marginTop: 'auto', width: '100%' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {products.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No hay productos registrados.</p>}
      </div>
    </div>
  );
};

export default AdminDashboard;

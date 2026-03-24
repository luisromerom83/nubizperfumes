import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [products, setProducts] = useState([]);
  const [ordersHistory, setOrdersHistory] = useState([]);
  const [activeOrderItems, setActiveOrderItems] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', password: '' });
  const [isUploading, setIsUploading] = useState(false);
  
  const [newProduct, setNewProduct] = useState({ name: '', size: '', price: '', type: 'stock', image: null });
  const [editingId, setEditingId] = useState(null);
  const [currentImageURL, setCurrentImageURL] = useState('');

  useEffect(() => {
    const auth = sessionStorage.getItem('isAdminAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchProducts();
      fetchOrdersHistory();
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const resp = await fetch('/api/products');
      const data = await resp.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fetchOrdersHistory = async () => {
    try {
      const resp = await fetch('/api/orders');
      const data = await resp.json();
      setOrdersHistory(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleCatalogSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let imageURL = currentImageURL;
      if (newProduct.image) {
        const base64Image = await fileToBase64(newProduct.image);
        const uploadResp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newProduct.image.name, base64: base64Image })
        });
        if (!uploadResp.ok) throw new Error('Error al subir imagen');
        const blob = await uploadResp.json();
        imageURL = blob.url;
      }
      if (!imageURL) throw new Error('Se requiere una imagen');

      const method = editingId ? 'PUT' : 'POST';
      const payload = {
        name: newProduct.name,
        size: (newProduct.type === 'order' && !newProduct.size) ? 'N/A' : newProduct.size,
        price: (newProduct.type === 'order' && !newProduct.price) ? 0 : parseFloat(newProduct.price),
        imageURL,
        type: newProduct.type,
        ...(editingId && { id: editingId })
      };

      const prodResp = await fetch('/api/products', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!prodResp.ok) throw new Error('Error al guardar producto');

      alert(editingId ? '¡Producto actualizado!' : '¡Producto creado!');
      resetForm();
      fetchProducts();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setNewProduct({ name: '', size: '', price: '', type: 'stock', image: null });
    setEditingId(null);
    setCurrentImageURL('');
  };

  const handleEdit = (p) => {
    setNewProduct({ name: p.name, size: p.size, price: p.price, type: p.type, image: null });
    setEditingId(p.id);
    setCurrentImageURL(p.image_url);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteProduct = async (id) => {
    if (window.confirm("¿Eliminar del catálogo?")) {
      try {
        await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        setProducts(products.filter(p => p.id !== id));
      } catch (e) { console.error(e); }
    }
  };

  // --- ORDER MANAGEMENT ---
  const addToOrderList = (p) => {
    const newItem = {
      orderId: Date.now(),
      id: p.id,
      name: p.name,
      price: parseFloat(p.price || 0),
      size: p.size === 'N/A' ? '' : p.size,
      quantity: 1,
      comment: ''
    };
    setActiveOrderItems([...activeOrderItems, newItem]);
  };

  const updateOrderItem = (orderId, updates) => {
    setActiveOrderItems(activeOrderItems.map(item => 
      item.orderId === orderId ? { ...item, ...updates } : item
    ));
  };

  const getTotal = () => {
    const total = activeOrderItems.reduce((acc, i) => acc + (parseFloat(i.price) * (parseInt(i.quantity) || 1)), 0);
    return isNaN(total) ? "0.00" : total.toFixed(2);
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div className="glass" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
          <h2>DEPORTUX Admin</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (loginData.user === 'admin' && loginData.password === 'Anitalavalatin4') {
              setIsAuthenticated(true);
              sessionStorage.setItem('isAdminAuthenticated', 'true');
              fetchProducts(); fetchOrdersHistory();
            } else alert('Solo personal autorizado');
          }} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <input type="text" placeholder="User" className="glass" style={{ padding: '1rem', color: 'white' }} onChange={e => setLoginData({...loginData, user: e.target.value})} />
            <input type="password" placeholder="Pass" className="glass" style={{ padding: '1rem', color: 'white' }} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            <button type="submit" className="btn btn-primary">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page" style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.png" alt="Logo" style={{ height: '40px' }} />
          <h1>Admin Deportux</h1>
        </div>
        <Link to="/" className="btn">Ver Catálogo Público</Link>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr', gap: '2rem' }}>
        
        {/* COLUMNA IZQUIERDA: FORMULARIO E INVENTARIO */}
        <div>
          <section className="glass" style={{ padding: '1.5rem', marginBottom: '2rem', border: editingId ? '2px solid #3b82f6' : 'none' }}>
            <h3>{editingId ? 'Editando Producto' : 'Añadir Producto'}</h3>
            <form onSubmit={handleCatalogSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <input type="text" placeholder="Nombre" required className="glass" style={{ padding: '0.6rem', color: 'white' }}
                  value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <input type="text" placeholder="Talla" required={newProduct.type === 'stock'} className="glass" style={{ padding: '0.6rem', color: 'white' }}
                  value={newProduct.size} onChange={e => setNewProduct({...newProduct, size: e.target.value})} />
                <select className="glass" style={{ padding: '0.6rem', color: 'white', background: '#1e293b' }}
                  value={newProduct.type} onChange={e => setNewProduct({...newProduct, type: e.target.value})}>
                  <option value="stock">Existencia</option>
                  <option value="order">Pedido</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                <input type="number" placeholder="Precio ($)" required={newProduct.type === 'stock'} className="glass" style={{ padding: '0.6rem', color: 'white' }}
                  value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                <input type="file" accept="image/*" className="glass" style={{ padding: '0.4rem', color: 'white' }}
                  onChange={e => setNewProduct({...newProduct, image: e.target.files[0]})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>{isUploading ? '...' : (editingId ? 'Guardar' : 'Publicar')}</button>
                {editingId && <button type="button" onClick={resetForm} className="btn" style={{ background: '#444' }}>Cancelar</button>}
              </div>
            </form>
          </section>

          <h2>Inventario</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <div>
              <p style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>DISPONIBLE</p>
              {products.filter(p => !p.type || p.type === 'stock').map(p => <AdminItem key={p.id} p={p} onAdd={addToOrderList} onDelete={deleteProduct} onEdit={handleEdit} />)}
            </div>
            <div>
              <p style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem' }}>BAJO PEDIDO</p>
              {products.filter(p => p.type === 'order').map(p => <AdminItem key={p.id} p={p} onAdd={addToOrderList} onDelete={deleteProduct} onEdit={handleEdit} />)}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PEDIDO ACTUAL EXPANDIDO */}
        <aside>
          <div className="glass" style={{ padding: '1.5rem', border: '2px solid var(--primary)', position: 'sticky', top: '1rem', height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              Pedido Actual 🛒
              <span>({activeOrderItems.length})</span>
            </h3>
            
            <div style={{ maxHeight: '500px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              {activeOrderItems.map(item => (
                <div key={item.orderId} className="glass" style={{ padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                    <strong>{item.name}</strong>
                    <button onClick={() => setActiveOrderItems(activeOrderItems.filter(i => i.orderId !== item.orderId))} 
                      style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar ×</button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.7rem' }}>Talla</label>
                      <input type="text" className="glass" style={{ width: '100%', padding: '0.3rem', color: 'white' }} 
                        value={item.size} onChange={e => updateOrderItem(item.orderId, { size: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem' }}>Cant.</label>
                      <input type="number" className="glass" style={{ width: '100%', padding: '0.3rem', color: 'white' }} 
                        value={item.quantity} onChange={e => updateOrderItem(item.orderId, { quantity: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.7rem' }}>Precio unit.</label>
                      <input type="number" className="glass" style={{ width: '100%', padding: '0.3rem', color: 'white' }} 
                        value={item.price} onChange={e => updateOrderItem(item.orderId, { price: e.target.value })} />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: '0.7rem' }}>Comentario / Notas</label>
                    <input type="text" placeholder="Ej: Color azul, entrega sábado..." className="glass" 
                      style={{ width: '100%', padding: '0.3rem', color: 'white', fontSize: '0.8rem' }}
                      value={item.comment} onChange={e => updateOrderItem(item.orderId, { comment: e.target.value })} />
                  </div>
                </div>
              ))}
              {activeOrderItems.length === 0 && <p style={{ textAlign: 'center', opacity: 0.5 }}>Selecciona productos del inventario</p>}
            </div>

            <div style={{ borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', marginBottom: '1rem' }}>
                <span>TOTAL:</span>
                <strong>${getTotal()}</strong>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', padding: '1.2rem' }} disabled={activeOrderItems.length === 0}
                onClick={async () => {
                  try {
                    await fetch('/api/orders', { 
                      method: 'POST', 
                      headers: { 'Content-Type': 'application/json' }, 
                      body: JSON.stringify({ items: activeOrderItems, total_price: getTotal() }) 
                    });
                    setActiveOrderItems([]); fetchOrdersHistory(); alert('VENTA REGISTRADA CON ÉXITO');
                  } catch (e) { alert('Error al registrar'); }
                }}>FINALIZAR PEDIDO</button>
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

const AdminItem = ({ p, onAdd, onDelete, onEdit }) => (
  <div className="glass" style={{ padding: '0.8rem', display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '0.8rem' }}>
    <img src={p.image_url} style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} alt="" />
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>{p.name}</p>
      <div style={{ display: 'flex', gap: '0.3rem' }}>
        <button onClick={() => onAdd(p)} className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}>Añadir +</button>
        <button onClick={() => onEdit(p)} className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', background: '#3b82f6' }}>Mod</button>
        <button onClick={() => onDelete(p.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', fontSize: '1rem', cursor: 'pointer' }}>×</button>
      </div>
    </div>
  </div>
);

export default AdminDashboard;

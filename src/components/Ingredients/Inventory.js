// src/components/Ingredients/Inventory.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Edit2, Trash2, AlertCircle, XCircle } from 'lucide-react';
import { isPriority, isExpired, formatDate } from '../../utils/dateCalculations';
import { searchFood } from '../../services/foodDatabase';
import Modal from '../../utils/Modal';

const Inventory = ({ setCurrentView, userId }) => {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  
  // Estados para modales
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  async function loadIngredients() {
  try {
    console.log('UserID:', userId);
    const querySnapshot = await getDocs(collection(db, `users/${userId}/ingredients`));
    const ingredientsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Ingredients raw:', ingredientsData);

    const sorted = ingredientsData.sort((a, b) => {
      const aExpired = isExpired(a.expirationDate);
      const bExpired = isExpired(b.expirationDate);
      const aPriority = isPriority(a.expirationDate);
      const bPriority = isPriority(b.expirationDate);

      if (aExpired && !bExpired) return 1;
      if (!aExpired && bExpired) return -1;
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
      return 0;
    });

    console.log('Ingredients sorted:', sorted);
    setIngredients(sorted);

  } catch (error) {
    console.error('Error loading ingredients:', error);
  }
}

useEffect(() => {
  if (userId) loadIngredients();
}, [userId]);// ya no necesitas poner loadIngredients en las dependencias


  const showModal = (type, title, message, onConfirm = () => {}) => {
    setModalConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm
    });
  };

  const closeModal = () => {
    setModalConfig({ ...modalConfig, isOpen: false });
  };

  const handleDelete = (id, name) => {
    showModal(
      'confirm',
      'Eliminar ingrediente',
      `¿Estás seguro de eliminar ${name}?`,
      async () => {
        try {
          await deleteDoc(doc(db, `users/${userId}/ingredients`, id));
          setIngredients(ingredients.filter(ing => ing.id !== id));
          showModal('success', '¡Eliminado!', 'Ingrediente eliminado exitosamente');
        } catch (error) {
          console.error('Error al eliminar:', error);
          showModal('error', 'Error', 'Error al eliminar el ingrediente');
        }
      }
    );
  };

  const startEdit = (ingredient) => {
    setEditingId(ingredient.id);
    setEditForm({
      quantity: ingredient.quantity.toFixed(2), // Formatear a 2 decimales
      unit: ingredient.unit,
      expirationDate: ingredient.expirationDate,
      purchaseDate: ingredient.purchaseDate,
      name: ingredient.name
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (id) => {
    const newQuantity = parseFloat(editForm.quantity);

    //  VALIDACION ANTES DEL MODAL
    if (!newQuantity || newQuantity < 0.5) {
      showModal(
        'error',
        'Cantidad inválida',
        'La cantidad debe ser mayor o igual a 0.5'
      );
      return;
    }

    // ✅ SI PASA VALIDACIÓN, ahora sí confirmar
    showModal(
      'confirm',
      'Guardar cambios',
      '¿Deseas guardar los cambios realizados?',
      async () => {
        try {
          const ingredientRef = doc(db, `users/${userId}/ingredients`, id);
          const isFractioned = newQuantity < 1;

          let newExpirationDate = editForm.expirationDate;

          if (editForm.unit === 'Piezas') {
            const food = searchFood(editForm.name);
            if (food) {
              const purchaseDate = new Date(editForm.purchaseDate);
              const expDate = new Date(purchaseDate);

              if (isFractioned) {
                // 🧩 Fraccionado
                expDate.setDate(expDate.getDate() + food.fraccionado);
              } else {
                // 📦 Entero (regresar a fecha normal)
                expDate.setDate(expDate.getDate() + food.completo);
              }

              newExpirationDate = expDate.toISOString();
            }
          }

          // Guardar con cantidad formateada a 2 decimales
          const formattedQuantity = parseFloat(newQuantity.toFixed(2));

          await updateDoc(ingredientRef, {
            quantity: formattedQuantity,
            unit: editForm.unit,
            expirationDate: newExpirationDate,
            isFractioned
          });

          setIngredients(ingredients.map(ing =>
            ing.id === id
              ? {
                  ...ing,
                  quantity: formattedQuantity,
                  unit: editForm.unit,
                  expirationDate: newExpirationDate,
                  isFractioned
                }
              : ing
          ));

          setEditingId(null);
          setEditForm({});
          showModal('success', '¡Actualizado!', 'Ingrediente actualizado exitosamente');
        } catch (error) {
          console.error('Error al actualizar:', error);
          showModal('error', 'Error', 'Error al actualizar el ingrediente');
        }
      }
    );
  };

  // Función para formatear cantidad a 2 decimales
  const formatQuantity = (quantity) => {
    return parseFloat(quantity).toFixed(2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Cargando inventario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => setCurrentView('menu')} 
          className="mb-6 text-emerald-600 font-semibold hover:underline"
        >
          ← Volver al menú
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Mi Inventario</h2>
          
          {ingredients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No tienes ingredientes registrados</p>
              <button
                onClick={() => setCurrentView('register-ingredient')}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition"
              >
                Registrar primer ingrediente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Ingrediente</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Cantidad</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Fecha de Compra</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Fecha de Caducidad</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Estado</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => {
                    const isEditing = editingId === ingredient.id;
                    const expired = isExpired(ingredient.expirationDate);
                    const priority = !expired && isPriority(ingredient.expirationDate);

                    return (
                      <tr 
                        key={ingredient.id} 
                        className={`border-b border-gray-100 ${
                          expired ? 'bg-gray-100' : priority ? 'bg-red-50' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-gray-800 text-sm font-medium">
                          {ingredient.name}
                        </td>
                        
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.01"
                                min="0.5"
                                value={editForm.quantity}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    quantity: e.target.value
                                  })
                                }
                                onBlur={() => {
                                  const value = parseFloat(editForm.quantity);
                                  if (!isNaN(value)) {
                                    setEditForm({
                                      ...editForm,
                                      quantity: value.toFixed(2)
                                    });
                                  }
                                }}
                                className="w-20 px-2 py-1 border rounded text-sm"
                              />
                              <select
                                value={editForm.unit}
                                onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                                className="px-2 py-1 border rounded text-sm"
                              >
                                <option>Piezas</option>
                                <option>Gramos</option>
                                <option>Kilogramos</option>
                                <option>Mililitros</option>
                                <option>Litros</option>
                              </select>
                            </div>
                          ) : (
                            `${formatQuantity(ingredient.quantity)} ${ingredient.unit}`
                          )}
                        </td>
                        
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {formatDate(ingredient.purchaseDate)}
                        </td>
                        
                        <td className="py-3 px-4 text-gray-600 text-sm">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.expirationDate ? new Date(editForm.expirationDate).toISOString().split('T')[0] : ''}
                              onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })}
                              className="px-2 py-1 border rounded text-sm"
                            />
                          ) : (
                            formatDate(ingredient.expirationDate)
                          )}
                        </td>
                        
                        <td className="py-3 px-4">
                          {expired ? (
                            <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                              <XCircle size={12} />
                              Caducado
                            </span>
                          ) : priority ? (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                              <AlertCircle size={12} />
                              Prioritario
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                              Normal
                            </span>
                          )}
                        </td>
                        
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => saveEdit(ingredient.id)}
                                className="text-green-600 hover:text-green-700 text-sm font-semibold"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-gray-600 hover:text-gray-700 text-sm font-semibold"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => startEdit(ingredient)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(ingredient.id, ingredient.name)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
      />
    </div>
  );
};

export default Inventory;
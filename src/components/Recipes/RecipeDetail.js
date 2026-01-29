// src/components/Recipes/RecipeDetail.js
import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { calculateDishShelfLife } from '../../services/openaiService';
import Modal from '../../utils/Modal';

const RecipeDetail = ({ setCurrentView, recipe, userId }) => {
  const [usedIngredients, setUsedIngredients] = useState(
    recipe.ingredients?.map(ing => ({ 
      ...ing, 
      used: true,
      usedQuantity: ing.quantity,
      usedUnit: ing.unit
    })) || []
  );
  const [saving, setSaving] = useState(false);
  
  // Estados para modales
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {}
  });

  if (!recipe) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No hay receta seleccionada</p>
          <button
            onClick={() => setCurrentView('recipe-results')}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

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

  const toggleIngredient = (index) => {
    setUsedIngredients(usedIngredients.map((ing, i) => 
      i === index ? { ...ing, used: !ing.used } : ing
    ));
  };

  const handleTempChange = (index, value) => {
    setUsedIngredients(usedIngredients.map((ing, i) =>
      i === index ? { ...ing, usedQuantity: value } : ing
    ));
  };

  const handleQuantityBlur = (index) => {
    const value = parseFloat(usedIngredients[index].usedQuantity);

    if (isNaN(value) || value < 0.25) {
      showModal(
        'error',
        'Cantidad inválida',
        'La cantidad mínima permitida es 0.25. Se ajustará automáticamente.',
        () => {
          setUsedIngredients(usedIngredients.map((ing, i) =>
            i === index ? { ...ing, usedQuantity: 0.25 } : ing
          ));
        }
      );
    }
  };

  const handleUnitChange = (index, newUnit) => {
    setUsedIngredients(usedIngredients.map((ing, i) => 
      i === index ? { ...ing, usedUnit: newUnit } : ing
    ));
  };

  const handleMarkAsCompleted = () => {
    showModal(
      'confirm',
      'Marcar como terminada',
      '¿Estás seguro de marcar esta receta como terminada? Se actualizará tu inventario.',
      async () => {
        setSaving(true);
        try {
          const ingredientsSnapshot = await getDocs(
            collection(db, `users/${userId}/ingredients`)
          );
          
          const usedIngredientsReport = []; // Para mostrar al final
          
          for (const ing of usedIngredients) {
            if (!ing.used) continue;
            
            const ingredientDoc = ingredientsSnapshot.docs.find(doc => {
              const docData = doc.data();
              return docData.name.toLowerCase().trim() === ing.name.toLowerCase().trim();
            });
            
            if (ingredientDoc) {
              const currentData = ingredientDoc.data();
              const quantityUsed = parseFloat(ing.usedQuantity) || 0;
              const newQuantity = currentData.quantity - quantityUsed;
              
              if (newQuantity <= 0) {
                await deleteDoc(doc(db, `users/${userId}/ingredients`, ingredientDoc.id));
                usedIngredientsReport.push(`${ing.name}: Usadas 🥳 (se acabó)`);
              } else {
                const isFractioned = newQuantity < 1;
                const updateData = {
                  quantity: newQuantity,
                  isFractioned
                };

                // Actualizar fecha de caducidad si es Piezas y se vuelve fraccionado
                if (currentData.unit === 'Piezas' && isFractioned && !currentData.isFractioned) {
                  const { searchFood } = await import('../../services/foodDatabase');
                  const food = searchFood(currentData.name);
                  
                  if (food && food.fraccionado > 0) {
                    const purchaseDate = new Date(currentData.purchaseDate);
                    const newExpDate = new Date(purchaseDate);
                    newExpDate.setDate(newExpDate.getDate() + food.fraccionado);
                    updateData.expirationDate = newExpDate.toISOString();
                  }
                }

                await updateDoc(doc(db, `users/${userId}/ingredients`, ingredientDoc.id), updateData);
                usedIngredientsReport.push(`${ing.name}: ${quantityUsed} ${ing.usedUnit} usadas`);
              }
            }
          }

          const usedIngredientsForHistory = usedIngredients
            .filter(ing => ing.used)
            .map(ing => ({
              name: ing.name,
              quantity: ing.usedQuantity,
              unit: ing.usedUnit
            }));

          await addDoc(collection(db, `users/${userId}/history`), {
            name: recipe.name,
            ingredients: usedIngredientsForHistory,
            instructions: recipe.instructions || [],
            categories: recipe.categories || [],
            prepTime: recipe.prepTime || null,
            servings: recipe.servings || 2,
            completedAt: new Date().toISOString(),
            favorite: false
          });

          const reportMessage = usedIngredientsReport.length > 0 
            ? (
              <div>
                <p className="font-semibold mb-2">Inventario actualizado:</p>
                <ul className="text-left space-y-1">
                  {usedIngredientsReport.map((report, idx) => (
                    <li key={idx} className="text-sm">• {report}</li>
                  ))}
                </ul>
              </div>
            )
            : 'Receta completada exitosamente';

          showModal('success', '¡Receta completada! 🎉', reportMessage, () => {
            setCurrentView('menu');
          });
        } catch (error) {
          console.error('Error al completar receta:', error);
          showModal('error', 'Error', `Error al guardar: ${error.message}`);
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const handleSaveAsPending = () => {
    showModal(
      'confirm',
      'Guardar como pendiente',
      '¿Deseas guardar este platillo como pendiente? Se actualizará tu inventario y podrás terminarlo después.',
      async () => {
        setSaving(true);
        try {
          // Actualizar inventario (igual que en handleMarkAsCompleted)
          const ingredientsSnapshot = await getDocs(
            collection(db, `users/${userId}/ingredients`)
          );
          
          const usedIngredientsReport = [];
          
          for (const ing of usedIngredients) {
            if (!ing.used) continue;
            
            const ingredientDoc = ingredientsSnapshot.docs.find(doc => {
              const docData = doc.data();
              return docData.name.toLowerCase().trim() === ing.name.toLowerCase().trim();
            });
            
            if (ingredientDoc) {
              const currentData = ingredientDoc.data();
              const quantityUsed = parseFloat(ing.usedQuantity) || 0;
              const newQuantity = currentData.quantity - quantityUsed;
              
              if (newQuantity <= 0) {
                await deleteDoc(doc(db, `users/${userId}/ingredients`, ingredientDoc.id));
                usedIngredientsReport.push(`${ing.name}: Usadas 🥳 (se acabó)`);
              } else {
                const isFractioned = newQuantity < 1;
                const updateData = {
                  quantity: newQuantity,
                  isFractioned
                };

                // Actualizar fecha de caducidad si es Piezas y se vuelve fraccionado
                if (currentData.unit === 'Piezas' && isFractioned && !currentData.isFractioned) {
                  const { searchFood } = await import('../../services/foodDatabase');
                  const food = searchFood(currentData.name);
                  
                  if (food && food.fraccionado > 0) {
                    const purchaseDate = new Date(currentData.purchaseDate);
                    const newExpDate = new Date(purchaseDate);
                    newExpDate.setDate(newExpDate.getDate() + food.fraccionado);
                    updateData.expirationDate = newExpDate.toISOString();
                  }
                }

                await updateDoc(doc(db, `users/${userId}/ingredients`, ingredientDoc.id), updateData);
                usedIngredientsReport.push(`${ing.name}: ${quantityUsed} ${ing.usedUnit} usadas`);
              }
            }
          }

          let daysRemaining = 3;
          
          try {
            // Solo pasar los nombres de los ingredientes, ChatGPT calculará la vida útil
            const ingredientNames = recipe.ingredients.map(ing => ({
              name: ing.name
            }));
            
            daysRemaining = await calculateDishShelfLife(ingredientNames);
          } catch (error) {
            console.log('Usando días por defecto (3)');
          }

          const usedIngredientsForPending = usedIngredients
            .filter(ing => ing.used)
            .map(ing => ({
              name: ing.name,
              quantity: ing.usedQuantity,
              unit: ing.usedUnit
            }));

          await addDoc(collection(db, `users/${userId}/pendingDishes`), {
            name: recipe.name,
            ingredients: usedIngredientsForPending,
            instructions: recipe.instructions || [],
            daysRemaining: daysRemaining,
            expirationDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString()
          });

          await addDoc(collection(db, `users/${userId}/history`), {
            name: recipe.name,
            ingredients: usedIngredientsForPending,
            instructions: recipe.instructions || [],
            categories: recipe.categories || [],
            prepTime: recipe.prepTime || null,
            servings: recipe.servings || 2,
            completedAt: new Date().toISOString(),
            favorite: false
          });

          const reportMessage = usedIngredientsReport.length > 0 
            ? (
              <div>
                <p className="font-semibold mb-2">Inventario actualizado:</p>
                <ul className="text-left space-y-1 mb-3">
                  {usedIngredientsReport.map((report, idx) => (
                    <li key={idx} className="text-sm">• {report}</li>
                  ))}
                </ul>
                <p className="text-sm mt-3 pt-3 border-t border-gray-200">
                  Se conservará por aproximadamente {daysRemaining} días.
                </p>
              </div>
            )
            : `Se conservará por aproximadamente ${daysRemaining} días.`;

          showModal('success', '¡Platillo guardado! 📦', reportMessage, () => {
            setCurrentView('menu');
          });
        } catch (error) {
          console.error('Error al guardar platillo:', error);
          showModal('error', 'Error', `Error al guardar: ${error.message}`);
        } finally {
          setSaving(false);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => setCurrentView('recipe-results')} 
          className="mb-6 text-emerald-600 font-semibold hover:underline"
        >
          ← Volver a resultados
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">{recipe.name}</h2>
          
          <div className="flex gap-2 mb-6">
            {recipe.categories?.map((cat, idx) => (
              <span 
                key={idx}
                className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold"
              >
                {cat}
              </span>
            ))}
          </div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Ingredientes de tu inventario</h3>
            <p className="text-xs text-gray-500 mb-3">
              Marca los que usaste y ajusta las cantidades si es necesario
            </p>
            <div className="space-y-3">
              {usedIngredients.map((ing, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start gap-3">
                    <input 
                      type="checkbox"
                      checked={ing.used}
                      onChange={() => toggleIngredient(index)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1">
                      <p className={`font-semibold ${!ing.used ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {ing.name}
                      </p>
                      
                      {ing.used && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="number"
                            step="0.01"
                            value={ing.usedQuantity}
                            onChange={(e) => handleTempChange(index, e.target.value)}
                            onBlur={() => handleQuantityBlur(index)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Cantidad"
                          />
                          <div className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium border border-gray-300 shadow-inner">
                            {ing.usedUnit}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Receta sugiere:</p>
                      <p className="text-sm text-gray-600">{ing.quantity} {ing.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-3">Ingredientes adicionales necesarios</h3>
              <ul className="list-disc list-inside space-y-1">
                {recipe.missingIngredients.map((ing, idx) => (
                  <li key={idx} className="text-gray-700">
                    {ing.quantity} {ing.unit} de {ing.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-3">Instrucciones de Preparación</h3>
            <ol className="space-y-3 list-decimal list-inside">
              {recipe.instructions?.map((instruction, idx) => (
                <li key={idx} className="text-gray-700">{instruction}</li>
              ))}
            </ol>
          </div>
          
          {recipe.prepTime && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Tiempo de preparación:</strong> {recipe.prepTime} minutos
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleMarkAsCompleted}
              disabled={saving}
              className="bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Guardando...' : 'Marcar como Terminada'}
            </button>
            <button 
              onClick={handleSaveAsPending}
              disabled={saving}
              className="bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Guardando...' : 'Guardar como Pendiente'}
            </button>
          </div>
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

export default RecipeDetail;
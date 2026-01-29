// src/components/Recipes/GenerateRecipe.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Search, AlertCircle, ChefHat } from 'lucide-react';
import { isPriority, isExpired, getDaysRemaining } from '../../utils/dateCalculations';
import { generateRecipe } from '../../services/openaiService';

const GenerateRecipe = ({ setCurrentView, userId, setGeneratedRecipes, setCurrentRecipeIndex }) => {
  const [ingredients, setIngredients] = useState([]);
  const [pendingDishes, setPendingDishes] = useState([]);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState('');

  
  // Opciones de receta
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [mealTime, setMealTime] = useState('Comida');
  const [servings, setServings] = useState(2);

  const categories = [
    'Snack', 'Postre', 'Saludable', 'Rápida', 
    'Internacional', 'Mexicana', 'Vegana', 
    'Vegetariana', 'Alta en proteína'
  ];

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      // Cargar ingredientes (solo los NO caducados)
      const ingredientsSnapshot = await getDocs(collection(db, `users/${userId}/ingredients`));
      const ingredientsData = ingredientsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(ing => !isExpired(ing.expirationDate));
      
      setIngredients(ingredientsData);

      // Cargar platillos pendientes (solo los NO caducados)
      const dishesSnapshot = await getDocs(collection(db, `users/${userId}/pendingDishes`));
      const dishesData = dishesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            daysRemaining: getDaysRemaining(data.expirationDate) || 0
          };
        })
        .filter(dish => !isExpired(dish.expirationDate));
      
      setPendingDishes(dishesData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar ingredientes');
    } finally {
      setLoading(false);
    }
  };

  // Separar ingredientes prioritarios y normales
  const priorityIngredients = ingredients.filter(ing => isPriority(ing.expirationDate));
  const normalIngredients = ingredients.filter(ing => !isPriority(ing.expirationDate));

  // Filtrar por búsqueda
  const filteredPriority = priorityIngredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredNormal = normalIngredients.filter(ing =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleIngredient = (ingredientId) => {
    if (selectedIngredients.includes(ingredientId)) {
      setSelectedIngredients(selectedIngredients.filter(id => id !== ingredientId));
    } else {
      setSelectedIngredients([...selectedIngredients, ingredientId]);
    }
  };

  const toggleDish = (dishId) => {
    if (selectedDishes.includes(dishId)) {
      setSelectedDishes(selectedDishes.filter(id => id !== dishId));
    } else {
      setSelectedDishes([...selectedDishes, dishId]);
    }
  };

  const toggleCategory = (category) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleGenerate = async (priorityOnly = false) => {
    setError('');

    // Validaciones
    let ingredientsToUse = priorityOnly 
      ? priorityIngredients.map(ing => ing.id)
      : selectedIngredients;

      
    if (ingredientsToUse.length === 0 && selectedDishes.length === 0) {
      setError('Por favor selecciona al menos un ingrediente o platillo almacenado');
      setErrorType('validation');
      return;
    }

    if (selectedCategories.length === 0) {
      setError('Por favor selecciona al menos una categoría');
      setErrorType('validation');
      return;
    }

    setGenerating(true);

    try {
      // Preparar datos para la IA
      const selectedIngredientsData = ingredients.filter(ing => 
        ingredientsToUse.includes(ing.id)
      );

      const selectedDishesData = pendingDishes.filter(dish =>
        selectedDishes.includes(dish.id)
      );

      // Combinar ingredientes y platillos
      const allItems = [
        ...selectedIngredientsData.map(ing => ({
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit
        })),
        ...selectedDishesData.map(dish => ({
          name: dish.name,
          quantity: '1',
          unit: 'porción'
        }))
      ];

      // Generar recetas con OpenAI
      const recipes = await generateRecipe({
      ingredients: allItems,
      categories: selectedCategories,
      mealTime,
      servings,
      priorityOnly
    });

    sessionStorage.setItem('lastRecipeParams', JSON.stringify({
      ingredients: allItems,
      categories: selectedCategories,
      mealTime,
      servings,
      priorityOnly
    }));

    setGeneratedRecipes(recipes);
    setCurrentRecipeIndex(0);
    setCurrentView('recipe-results');

    } catch (error) {
      console.error('Error al generar recetas:', error);
      
      // ✅ MOSTRAR EL ERROR AL USUARIO EN EL FRONTEND
      if (error.message && error.message.includes('No es posible')) {
        // Error de categorías incompatibles
        setError(error.message);
        setErrorType('ai');
      } else {
        // Error genérico
        setError('Error al generar recetas. Verifica tu conexión y API key de OpenAI.');
        setErrorType('ai');
      }
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Cargando...</p>
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
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Generar Recetas con IA</h2>
          
          {/* Buscador */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                placeholder="Buscar ingrediente en tu inventario..."
              />
            </div>
          </div>
          
          {/* Ingredientes Prioritarios */}
          {filteredPriority.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="text-red-500" size={20} />
                <h3 className="text-lg font-bold text-gray-800">
                  Ingredientes Prioritarios (Próximos a caducar)
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredPriority.map(ing => (
                  <div 
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition ${
                      selectedIngredients.includes(ing.id)
                        ? 'border-red-500 bg-red-100'
                        : 'border-red-200 bg-red-50 hover:bg-red-100'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{ing.name}</p>
                        <p className="text-xs text-red-600">
                          {ing.quantity} {ing.unit}
                        </p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={selectedIngredients.includes(ing.id)}
                        onChange={() => {}}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Ingredientes Generales */}
          {filteredNormal.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Ingredientes Disponibles</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {filteredNormal.map(ing => (
                  <div 
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition ${
                      selectedIngredients.includes(ing.id)
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{ing.name}</p>
                        <p className="text-xs text-gray-500">
                          {ing.quantity} {ing.unit}
                        </p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={selectedIngredients.includes(ing.id)}
                        onChange={() => {}}
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platillos Almacenados */}
          {pendingDishes.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Platillos Almacenados</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {pendingDishes.map(dish => {
                  const isExpiringSoon = dish.daysRemaining <= 2;
                  
                  return (
                    <div 
                      key={dish.id}
                      onClick={() => toggleDish(dish.id)}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition ${
                        selectedDishes.includes(dish.id)
                          ? 'border-orange-500 bg-orange-100'
                          : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{dish.name}</p>
                          <p className={`text-xs ${isExpiringSoon ? 'text-red-600 font-semibold' : 'text-orange-600'}`}>
                            Caduca en {dish.daysRemaining} días
                          </p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={selectedDishes.includes(dish.id)}
                          onChange={() => {}}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Mensaje si no hay ingredientes disponibles */}
          {ingredients.length === 0 && pendingDishes.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg mb-6">
              <p className="text-gray-600 mb-4">
                No tienes ingredientes ni platillos disponibles para generar recetas.
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Los ingredientes y platillos caducados no se muestran aquí.
              </p>
              <button
                onClick={() => setCurrentView('register-ingredient')}
                className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition"
              >
                Registrar ingredientes
              </button>
            </div>
          )}
          
          {/* Opciones de Receta */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categorías
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {categories.map(cat => (
                  <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="checkbox"

                      checked={selectedCategories.includes(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="rounded"
                    />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horario del platillo
              </label>
              <select 
                value={mealTime}
                onChange={(e) => setMealTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option>Desayuno</option>
                <option>Comida</option>
                <option>Cena</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de personas
              </label>
              <input 
                type="number"
                min="1"
                max="20"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* ✅ MOSTRAR ERROR AL USUARIO */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm mb-4 flex items-start gap-2">
              <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold mb-1">Error</p>
                <p>{error}</p>

                {errorType === 'ai' && (
                  <p className="mt-2 text-xs">
                    💡 Intenta ajustar las categorías seleccionadas o usar ingredientes diferentes.
                  </p>
                )}
              </div>
            </div>
          )}


          {/* Botones de generación */}
          <button 
            onClick={() => handleGenerate(false)}
            disabled={generating || (ingredients.length === 0 && pendingDishes.length === 0)}
            className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChefHat size={20} />
            {generating ? 'Generando recetas...' : 'Generar Recetas con IA'}
          </button>
          
          {priorityIngredients.length > 0 && (
            <button 
              onClick={() => handleGenerate(true)}
              disabled={generating}
              className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition flex items-center justify-center gap-2 mt-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <AlertCircle size={20} />
              Generar Receta usando todos los Ingredientes Prioritarios
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GenerateRecipe;
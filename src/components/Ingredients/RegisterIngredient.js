// src/components/Ingredients/RegisterIngredient.js
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getFoodSuggestions, calculateExpirationDate } from '../../services/foodDatabase';
import { toISODateString, getTodayISO } from '../../utils/dateCalculations';

// 🔹 Normaliza fecha para evitar desfase por UTC (fija hora a 12:00 PM)
const normalizeDateForFirestore = (isoDate) => {
  const [year, month, day] = isoDate.split('-');
  return new Date(year, month - 1, day, 12).toISOString();
};

const RegisterIngredient = ({ setCurrentView, userId }) => {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'Piezas',
    purchaseDate: getTodayISO(),
    expirationDate: ''
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualExpiration, setManualExpiration] = useState(false);

  const handleNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, name: value });

    if (value.length >= 2) {
      const foodSuggestions = getFoodSuggestions(value);
      setSuggestions(foodSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setFormData({ ...formData, name: suggestion });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.quantity || !formData.purchaseDate) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    if (parseFloat(formData.quantity) <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);

    try {
      // 🔹 Fecha de compra normalizada
      const normalizedPurchaseDate = normalizeDateForFirestore(formData.purchaseDate);

      let finalExpirationDate = formData.expirationDate;

      // 🔹 Calculo automatico de caducidad
      if (!manualExpiration || !formData.expirationDate) {
        const calculatedDate = calculateExpirationDate(
          formData.purchaseDate, // se calcula con fecha "logica"
          formData.name,
          parseFloat(formData.quantity)
        );

        if (calculatedDate) {
          finalExpirationDate = toISODateString(calculatedDate);
        } else {
          setError('No se pudo calcular la fecha de caducidad. Por favor ingresala manualmente.');
          setManualExpiration(true);
          setLoading(false);
          return;
        }
      }

      // 🔹 Fecha de caducidad normalizada
      const normalizedExpirationDate = normalizeDateForFirestore(finalExpirationDate);
      
      let finalQuantity = parseFloat(formData.quantity);

      // Limitar a maximo 2 decimales antes de guardar
      finalQuantity = parseFloat(finalQuantity.toFixed(2));


      const ingredientData = {
        name: formData.name,
        quantity: finalQuantity,
        unit: formData.unit,
        purchaseDate: normalizedPurchaseDate,
        expirationDate: normalizedExpirationDate,
        isFractioned: parseFloat(formData.quantity) < 1,
        createdAt: new Date().toISOString(),
        userId: userId
      };

      await addDoc(collection(db, `users/${userId}/ingredients`), ingredientData);

      setSuccess('¡Ingrediente registrado exitosamente!');
      
      // Limpiar formulario
      setFormData({
        name: '',
        quantity: '',
        unit: 'Piezas',
        purchaseDate: getTodayISO(),
        expirationDate: ''
      });
      setManualExpiration(false);

      // Ocultar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (error) {
      console.error('Error al registrar ingrediente:', error);
      setError('Error al registrar el ingrediente. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => setCurrentView('menu')} 
          className="mb-6 text-emerald-600 font-semibold hover:underline"
        >
          ← Volver al menú
        </button>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Registrar Ingrediente</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre del ingrediente con autocompletado */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del ingrediente *
              </label>
              <input 
                type="text"
                value={formData.name}
                onChange={handleNameChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                placeholder="Ej: manzana, leche, queso..."
                disabled={loading}
              />
              
              {/* Sugerencias */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <p className="text-xs text-gray-600 px-3 py-2 bg-gray-50 border-b">Sugerencias:</p>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => selectSuggestion(suggestion)}
                      className="text-sm text-emerald-600 hover:bg-emerald-50 px-3 py-2 cursor-pointer"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Cantidad y Unidad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad *
                </label>
                <input 
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                  placeholder="1"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad *
                </label>
                <select 
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  disabled={loading}
                >
                  <option>Piezas</option>
                  <option>Gramos</option>
                  <option>Kilogramos</option>
                  <option>Mililitros</option>
                  <option>Litros</option>
                </select>
              </div>
            </div>
            
            {/* Fecha de compra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de compra *
              </label>
              <input 
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                max={getTodayISO()}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                disabled={loading}
              />
            </div>
            
            {/* Fecha de caducidad opcional */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Fecha de caducidad (opcional)
                </label>
                <button
                  type="button"
                  onClick={() => setManualExpiration(!manualExpiration)}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  {manualExpiration ? 'Calcular automáticamente' : 'Ingresar manualmente'}
                </button>
              </div>
              
              {manualExpiration && (
                <input 
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                  min={formData.purchaseDate}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  disabled={loading}
                />
              )}
              
              <p className="text-xs text-gray-500 mt-1">
                {manualExpiration 
                  ? 'Ingresa la fecha de caducidad manualmente'
                  : 'Si no la ingresas, el sistema la calculará automáticamente'
                }
              </p>
            </div>
            
            {/* Mensajes de error y éxito */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}
            
            {/* Botón de submit */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Registrar Ingrediente'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterIngredient;
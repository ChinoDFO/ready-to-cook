// src/components/Recipes/RecipeResults.js
import React, { useState } from 'react';
import { Heart, ChevronRight, ChevronLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { generateRecipe } from '../../services/openaiService';

const RecipeResults = ({ 
  setCurrentView, 
  recipes, 
  currentIndex, 
  setCurrentIndex, 
  setSelectedRecipe,
  setGeneratedRecipes
}) => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [usedRecipeNames, setUsedRecipeNames] = useState([]);

  // Guardar los parámetros de la última generación
  const [lastParams] = useState(null);
  
  if (!recipes || recipes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No hay recetas generadas</p>
          <button
            onClick={() => setCurrentView('generate-recipe')}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const currentRecipe = recipes[currentIndex];
  

  const handleNext = () => {
    if (currentIndex < recipes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0); // Volver al inicio
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(recipes.length - 1); // Ir al final
    }
  };

  const handleViewDetails = () => {
    setSelectedRecipe(currentRecipe);
    setCurrentView('recipe-detail');
  };

  const handleGenerateAnother = async () => {
    if (!lastParams) {
      // Si no hay parámetros guardados, volver a la pantalla de generación
      setCurrentView('generate-recipe');
      return;
    }

    setGenerating(true);
    setError('');

    try {
            // Generar otra receta con los mismos parámetros
      const newRecipes = await generateRecipe({
        ...lastParams,
        regenerate: true,
        usedRecipeNames
      });



      // Agregar las nuevas recetas al array existente
      setGeneratedRecipes([...recipes, ...newRecipes]);

      setUsedRecipeNames(prev => [
        ...prev,
        ...newRecipes.map(r => r.name)
      ]);

      
      // Ir a la nueva receta (la última agregada)
      setCurrentIndex(recipes.length);
    } catch (error) {
      console.error('Error al generar otra receta:', error);
      
      if (error.message && error.message.includes('No es posible')) {
        setError(error.message);
      } else {
        setError('Error al generar otra receta. Intenta nuevamente.');
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4 flex flex-col">
      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setCurrentView('generate-recipe')} 
            className="text-emerald-600 text-sm font-semibold hover:underline"
          >
            ← Volver
          </button>
          
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="backdrop-blur-md bg-white/80 border border-gray-200 shadow-sm rounded-2xl px-5 py-3 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1">
              <p className="text-sm font-medium text-gray-800">
                ¿No te convenció esta receta?
              </p>
              <p className="text-xs text-gray-500 mt-1">
                No te preocupes, genera otra 😁
              </p>
            </div>

            <button
              onClick={handleGenerateAnother}
              disabled={generating}
              className="group flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-md transition-all duration-300 hover:bg-emerald-600 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
              <RefreshCw
                size={18}
                className={`
                  transition-transform duration-500
                  ${generating ? 'animate-spin' : 'group-hover:rotate-180'}
                `}
              />
              {generating ? 'Generando...' : 'Generar otra receta'}
            </button>
          </div>
        </div>
        
        <h2 className="text-4xl md:text-5xl font-extrabold text-center mb-10 text-gray-800 relative">
          <span className="relative z-10">Recetas Generadas</span>
          <span className="absolute inset-x-0 -bottom-2 h-3 bg-emerald-200/60 rounded-full blur-md"></span>
          <span className="absolute left-1/2 -translate-x-1/2 -bottom-3 h-1 w-28 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"></span>
        </h2>

        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        
        {/* Receta centrada y más grande */}
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl transform hover:scale-105 transition-transform">
            <div className="mb-6">
              <h3 className="text-4xl md:text-3.5xl font-semibold text-gray-800 mb-8 text-center tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]">
                {currentRecipe.name}
              </h3>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {currentRecipe.categories?.map((cat, idx) => (
                  <span 
                    key={idx}
                    className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-6 mb-6">
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                <strong className="text-emerald-700">Ingredientes principales:</strong>{' '}
                {currentRecipe.ingredients?.slice(0, 5).map(ing => ing.name).join(', ')}
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <div className="text-center bg-white rounded-lg px-6 py-3 shadow-sm">
                  <p className="text-3xl font-bold text-blue-600">{currentRecipe.servings || 2}</p>
                  <p className="text-xs text-gray-600">personas</p>
                </div>
              </div>
            </div>
            
            {/* Ingredientes faltantes */}
            {currentRecipe.missingIngredients && currentRecipe.missingIngredients.length > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-sm font-bold text-yellow-800 mb-2">⚠️ Ingredientes faltantes:</p>
                    <p className="text-sm text-yellow-700">
                      {currentRecipe.missingIngredients.map(ing => ing.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Advertencia de porciones */}
            {currentRecipe.portionWarning && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="text-sm font-bold text-red-800 mb-1">⚠️ Advertencia de porciones</p>
                    <p className="text-sm text-red-700">{currentRecipe.portionWarning}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-4">
              <button 
                onClick={handleViewDetails}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-4 rounded-xl text-base font-bold hover:from-emerald-600 hover:to-emerald-700 transition flex items-center justify-center gap-2 shadow-lg"
              >
                <Heart size={20} />
                Ver Receta Completa
              </button>
              
              {/* Botones de navegación si hay más de 1 receta */}
              {recipes.length > 1 && (
                <>
                  <button 
                    onClick={handlePrevious}
                    className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold hover:from-gray-200 hover:to-gray-300 transition flex items-center justify-center shadow-lg"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button 
                    onClick={handleNext}
                    className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 px-6 py-4 rounded-xl font-bold hover:from-gray-200 hover:to-gray-300 transition flex items-center justify-center shadow-lg"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Indicador de recetas */}
        <div className="text-center mt-6 mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {recipes.map((_, idx) => (
              <div 
                key={idx}
                className={`w-3 h-3 rounded-full transition ${
                  idx === currentIndex ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <p className="text-base text-gray-600 font-semibold">
            Receta {currentIndex + 1} de {recipes.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecipeResults;
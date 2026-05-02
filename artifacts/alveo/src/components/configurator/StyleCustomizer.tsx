'use client';

import React, { useState } from 'react';
import { ClosetConfiguration, UserPreferences } from '@/types/closet';
import { motion } from 'framer-motion';

interface StyleCustomizerProps {
  config: Partial<ClosetConfiguration>;
  onConfigChange: (config: Partial<ClosetConfiguration>) => void;
}

export function StyleCustomizer({ config, onConfigChange }: StyleCustomizerProps) {
  const [activeTab, setActiveTab] = useState<'materials' | 'colors' | 'layout'>('materials');

  const updateStyle = (field: keyof UserPreferences, value: string | boolean | string[]) => {
    onConfigChange({
      ...config,
      userInfo: {
        ...config.userInfo!,
        [field]: value
      }
    });
  };

  const woodFinishes = [
    { id: 'white', name: 'White Painted', description: 'Clean, crisp white finish', color: '#ffffff' },
    { id: 'light', name: 'Light Oak', description: 'Natural light wood grain', color: '#f5f1eb' },
    { id: 'medium', name: 'Medium Walnut', description: 'Rich medium brown tone', color: '#d4c2a8' },
    { id: 'dark', name: 'Dark Espresso', description: 'Deep, sophisticated dark', color: '#8d6e63' }
  ];

  const stylePreferences = [
    { id: 'minimal', name: 'Minimal', description: 'Clean lines, hidden storage', icon: '⬜' },
    { id: 'modern', name: 'Modern', description: 'Sleek contemporary design', icon: '🔳' },
    { id: 'glam', name: 'Glam', description: 'Luxurious with metallic accents', icon: '✨' },
    { id: 'rustic', name: 'Rustic', description: 'Natural, organic feel', icon: '🌿' },
    { id: 'luxury', name: 'Luxury', description: 'High-end hotel style', icon: '👑' }
  ];

  const hardwareOptions = [
    { id: 'chrome', name: 'Chrome', description: 'Polished modern chrome', color: '#c0c0c0' },
    { id: 'brass', name: 'Brass', description: 'Warm antique brass', color: '#b5651d' },
    { id: 'black', name: 'Matte Black', description: 'Contemporary black finish', color: '#2e2e2e' },
    { id: 'gold', name: 'Brushed Gold', description: 'Luxurious gold tone', color: '#d4af37' }
  ];

  const renderMaterialsTab = () => (
    <div className="space-y-6">
      {/* Wood Finish Selection */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Wood Finish</h4>
        <div className="grid grid-cols-2 gap-3">
          {woodFinishes.map((finish) => (
            <motion.button
              key={finish.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => updateStyle('woodFinish', finish.id)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${config.userInfo?.woodFinish === finish.id 
                  ? 'border-taupe-400 bg-taupe-50' 
                  : 'border-cream-200 hover:border-cream-300'
                }
              `}
            >
              <div 
                className="w-full h-12 rounded mb-3"
                style={{ backgroundColor: finish.color }}
              />
              <div className="font-medium text-charcoal-600">{finish.name}</div>
              <div className="text-xs text-charcoal-400">{finish.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Hardware Selection */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Hardware Finish</h4>
        <div className="grid grid-cols-2 gap-3">
          {hardwareOptions.map((hardware) => (
            <motion.button
              key={hardware.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => updateStyle('hardwareFinish', hardware.id)}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${config.userInfo?.hardwareFinish === hardware.id 
                  ? 'border-taupe-400 bg-taupe-50' 
                  : 'border-cream-200 hover:border-cream-300'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-6 h-6 rounded-full"
                  style={{ backgroundColor: hardware.color }}
                />
                <div>
                  <div className="font-medium text-charcoal-600 text-sm">{hardware.name}</div>
                  <div className="text-xs text-charcoal-400">{hardware.description}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderColorsTab = () => (
    <div className="space-y-6">
      {/* Style Preference */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Design Style</h4>
        <div className="space-y-3">
          {stylePreferences.map((style) => (
            <motion.button
              key={style.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => updateStyle('stylePreference', style.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${config.userInfo?.stylePreference === style.id 
                  ? 'border-taupe-400 bg-taupe-50' 
                  : 'border-cream-200 hover:border-cream-300'
                }
              `}
            >
              <div className="flex items-center space-x-4">
                <span className="text-2xl">{style.icon}</span>
                <div>
                  <div className="font-medium text-charcoal-600">{style.name}</div>
                  <div className="text-sm text-charcoal-400">{style.description}</div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Interior Color Accents */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Interior Accent Color</h4>
        <div className="grid grid-cols-4 gap-3">
          {[
            { name: 'None', color: 'transparent' },
            { name: 'Soft Pink', color: '#f8e8e8' },
            { name: 'Sage Green', color: '#e8f0e8' },
            { name: 'Powder Blue', color: '#e8f0f8' },
            { name: 'Warm Gray', color: '#f0f0f0' },
            { name: 'Cream', color: '#fef7ed' },
            { name: 'Lavender', color: '#f0e8f8' },
            { name: 'Champagne', color: '#f8f0e8' }
          ].map((color, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => updateStyle('accentColor', color.color)}
              className={`
                w-12 h-12 rounded-lg border-2 transition-all
                ${config.userInfo?.accentColor === color.color 
                  ? 'border-taupe-400 shadow-lg' 
                  : 'border-cream-200'
                }
              `}
              style={{ backgroundColor: color.color }}
              title={color.name}
            />
          ))}
        </div>
      </div>
    </div>
  );

  const renderLayoutTab = () => (
    <div className="space-y-6">
      {/* Drawer Preference */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Drawer Configuration</h4>
        <div className="space-y-3">
          {[
            { id: 'many-small', name: 'Many Small Drawers', description: 'More organization, easier to find items' },
            { id: 'few-large', name: 'Few Large Drawers', description: 'Cleaner look, easier to access' },
            { id: 'mixed', name: 'Mixed Sizes', description: 'Balanced approach, most flexible' }
          ].map((option) => (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => updateStyle('drawerPreference', option.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${config.userInfo?.drawerPreference === option.id 
                  ? 'border-taupe-400 bg-taupe-50' 
                  : 'border-cream-200 hover:border-cream-300'
                }
              `}
            >
              <div className="font-medium text-charcoal-600">{option.name}</div>
              <div className="text-sm text-charcoal-400 mt-1">{option.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Priority Items */}
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Storage Priorities</h4>
        <p className="text-sm text-charcoal-400 mb-3">What's most important to you?</p>
        <div className="space-y-2">
          {[
            { id: 'shoes', name: 'Shoe Storage', icon: '👠' },
            { id: 'hanging', name: 'Hanging Space', icon: '👔' },
            { id: 'folded', name: 'Folded Items', icon: '👕' },
            { id: 'accessories', name: 'Accessories', icon: '👜' }
          ].map((priority) => {
            const isSelected = config.userInfo?.priorityItems?.includes(priority.id as UserPreferences['priorityItems'][number]);
            return (
              <motion.label
                key={priority.id}
                whileHover={{ scale: 1.01 }}
                className={`
                  flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected ? 'border-taupe-400 bg-taupe-50' : 'border-cream-200 hover:border-cream-300'}
                `}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    const current = config.userInfo?.priorityItems || [];
                    const updated = e.target.checked 
                      ? [...current, priority.id]
                      : current.filter(item => item !== priority.id);
                    updateStyle('priorityItems', updated);
                  }}
                  className="mr-3"
                />
                <span className="text-xl mr-3">{priority.icon}</span>
                <span className="font-medium text-charcoal-600">{priority.name}</span>
              </motion.label>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-6 mt-6">
      <h3 className="font-serif text-xl text-charcoal-600 mb-6">
        Customize Your Style
      </h3>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-cream-100 rounded-lg p-1">
        {[
          { id: 'materials', name: 'Materials', icon: '🎨' },
          { id: 'colors', name: 'Style', icon: '✨' },
          { id: 'layout', name: 'Layout', icon: '📐' }
        ].map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.id as 'materials' | 'colors' | 'layout')}
            className={`
              flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === tab.id 
                ? 'bg-white text-charcoal-600 shadow-sm' 
                : 'text-charcoal-400 hover:text-charcoal-500'
              }
            `}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.name}
          </motion.button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'materials' && renderMaterialsTab()}
        {activeTab === 'colors' && renderColorsTab()}
        {activeTab === 'layout' && renderLayoutTab()}
      </motion.div>

      {/* Preview Summary */}
      <div className="mt-6 pt-6 border-t border-cream-200">
        <h5 className="font-medium text-charcoal-600 mb-3">Current Selection</h5>
        <div className="text-sm text-charcoal-500 space-y-1">
          <p>Style: {config.userInfo?.stylePreference || 'Not selected'}</p>
          <p>Wood Finish: {config.userInfo?.woodFinish || 'Not selected'}</p>
          <p>Drawers: {config.userInfo?.drawerPreference || 'Not selected'}</p>
          <p>Priorities: {config.userInfo?.priorityItems?.join(', ') || 'None selected'}</p>
        </div>
      </div>
    </div>
  );
}
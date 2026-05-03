'use client';

import React, { useState } from 'react';
import { ClosetConfiguration, UserPreferences, LightingOptions, RoomContext } from '@/types/closet';
import { motion } from 'framer-motion';

interface StyleCustomizerProps {
  config: Partial<ClosetConfiguration>;
  onConfigChange: (config: Partial<ClosetConfiguration>) => void;
}

type ActiveTab = 'materials' | 'colors' | 'layout' | 'lighting' | 'room';

export function StyleCustomizer({ config, onConfigChange }: StyleCustomizerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('materials');

  const updateStyle = (field: keyof UserPreferences, value: string | boolean | string[]) => {
    onConfigChange({ ...config, userInfo: { ...config.userInfo!, [field]: value } });
  };

  const updateLighting = (field: keyof LightingOptions, value: boolean) => {
    onConfigChange({ ...config, lighting: { ...config.lighting, [field]: value } });
  };

  const updateRoomContext = (field: keyof RoomContext, value: string | undefined) => {
    onConfigChange({ ...config, roomContext: { ...config.roomContext, [field]: value } });
  };

  const woodFinishes = [
    { id: 'white',  name: 'White Painted',  description: 'Clean, crisp white finish', color: '#ffffff' },
    { id: 'light',  name: 'Light Oak',      description: 'Natural light wood grain',  color: '#f5f1eb' },
    { id: 'medium', name: 'Medium Walnut',  description: 'Rich medium brown tone',    color: '#d4c2a8' },
    { id: 'dark',   name: 'Dark Espresso',  description: 'Deep, sophisticated dark',  color: '#8d6e63' },
  ];

  const stylePreferences = [
    { id: 'minimal', name: 'Minimal', description: 'Clean lines, hidden storage',        icon: '⬜' },
    { id: 'modern',  name: 'Modern',  description: 'Sleek contemporary design',          icon: '🔳' },
    { id: 'glam',    name: 'Glam',    description: 'Luxurious with metallic accents',    icon: '✨' },
    { id: 'rustic',  name: 'Rustic',  description: 'Natural, organic feel',              icon: '🌿' },
    { id: 'luxury',  name: 'Luxury',  description: 'High-end hotel style',               icon: '👑' },
  ];

  const hardwareOptions = [
    { id: 'chrome',        name: 'Chrome',       description: 'Polished modern chrome',      color: '#c0c0c0' },
    { id: 'brass',         name: 'Brass',        description: 'Warm antique brass',           color: '#b5651d' },
    { id: 'matte-black',   name: 'Matte Black',  description: 'Contemporary black finish',    color: '#2e2e2e' },
    { id: 'nickel',        name: 'Nickel',       description: 'Brushed nickel finish',        color: '#a8a8a4' },
  ];

  const WALL_COLOURS = [
    { name: 'None',           value: undefined,   hex: 'transparent',  border: 'border-dashed border-cream-300' },
    { name: 'Warm White',     value: '#f8f5f0',   hex: '#f8f5f0'  },
    { name: 'Soft Greige',    value: '#e8e2d8',   hex: '#e8e2d8'  },
    { name: 'Sage',           value: '#c8d4c8',   hex: '#c8d4c8'  },
    { name: 'Dusty Pink',     value: '#e8d0cc',   hex: '#e8d0cc'  },
    { name: 'Powder Blue',    value: '#ccd8e4',   hex: '#ccd8e4'  },
    { name: 'Deep Navy',      value: '#1e2d40',   hex: '#1e2d40'  },
    { name: 'Charcoal',       value: '#3a3a3a',   hex: '#3a3a3a'  },
    { name: 'Forest',         value: '#2d3f2e',   hex: '#2d3f2e'  },
    { name: 'Terracotta',     value: '#c17a58',   hex: '#c17a58'  },
    { name: 'Champagne',      value: '#f0e8d8',   hex: '#f0e8d8'  },
    { name: 'Lilac Mist',     value: '#d8d0e8',   hex: '#d8d0e8'  },
  ];

  const FLOOR_TYPES: { id: RoomContext['floorType']; label: string; preview: string }[] = [
    { id: 'hardwood',    label: 'Hardwood',    preview: 'bg-amber-700/70' },
    { id: 'herringbone', label: 'Herringbone', preview: 'bg-amber-600/70' },
    { id: 'marble',      label: 'Marble',      preview: 'bg-gray-200'     },
    { id: 'tile',        label: 'Tile',        preview: 'bg-gray-300'     },
    { id: 'carpet',      label: 'Carpet',      preview: 'bg-stone-400/60' },
  ];

  const LIGHTING_OPTIONS: { key: keyof LightingOptions; label: string; desc: string; icon: string }[] = [
    { key: 'underShelfLED', label: 'Under-Shelf LED Strip', desc: 'Warm LED tape light under every shelf board', icon: '💡' },
    { key: 'overheadRail',  label: 'Overhead Track Rail',   desc: 'Ceiling-mounted track rail with spot heads',  icon: '☀️' },
    { key: 'puckLights',    label: 'Recessed Puck Lights',  desc: 'Individual puck lights recessed under shelves', icon: '🔦' },
    { key: 'islandPendant', label: 'Island Pendant',        desc: 'Decorative pendant fitting above island unit', icon: '🕯️' },
  ];

  const renderMaterialsTab = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Wood Finish</h4>
        <div className="grid grid-cols-2 gap-3">
          {woodFinishes.map((finish) => (
            <motion.button
              key={finish.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => updateStyle('woodFinish', finish.id)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                config.userInfo?.woodFinish === finish.id
                  ? 'border-taupe-400 bg-taupe-50'
                  : 'border-cream-200 hover:border-cream-300'
              }`}
            >
              <div className="w-full h-12 rounded mb-3 border border-cream-200" style={{ backgroundColor: finish.color }} />
              <div className="font-medium text-charcoal-600">{finish.name}</div>
              <div className="text-xs text-charcoal-400">{finish.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Hardware Finish</h4>
        <div className="grid grid-cols-2 gap-3">
          {hardwareOptions.map((hw) => (
            <motion.button
              key={hw.id} whileHover={{ scale: 1.02 }}
              onClick={() => updateStyle('hardwareFinish', hw.id)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                config.userInfo?.hardwareFinish === hw.id
                  ? 'border-taupe-400 bg-taupe-50'
                  : 'border-cream-200 hover:border-cream-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full border border-cream-300" style={{ backgroundColor: hw.color }} />
                <div>
                  <div className="font-medium text-charcoal-600 text-sm">{hw.name}</div>
                  <div className="text-xs text-charcoal-400">{hw.description}</div>
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
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Design Style</h4>
        <div className="space-y-3">
          {stylePreferences.map((style) => (
            <motion.button
              key={style.id} whileHover={{ scale: 1.01 }}
              onClick={() => updateStyle('stylePreference', style.id)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                config.userInfo?.stylePreference === style.id
                  ? 'border-taupe-400 bg-taupe-50'
                  : 'border-cream-200 hover:border-cream-300'
              }`}
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

      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Interior Accent Color</h4>
        <div className="grid grid-cols-4 gap-3">
          {[
            { name: 'None',        color: 'transparent' },
            { name: 'Soft Pink',   color: '#f8e8e8' },
            { name: 'Sage Green',  color: '#e8f0e8' },
            { name: 'Powder Blue', color: '#e8f0f8' },
            { name: 'Warm Gray',   color: '#f0f0f0' },
            { name: 'Cream',       color: '#fef7ed' },
            { name: 'Lavender',    color: '#f0e8f8' },
            { name: 'Champagne',   color: '#f8f0e8' },
          ].map((color, index) => (
            <motion.button
              key={index} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              onClick={() => updateStyle('accentColor', color.color)}
              className={`w-12 h-12 rounded-lg border-2 transition-all ${
                config.userInfo?.accentColor === color.color ? 'border-taupe-400 shadow-lg' : 'border-cream-200'
              }`}
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
      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Drawer Configuration</h4>
        <div className="space-y-3">
          {[
            { id: 'many-small', name: 'Many Small Drawers', description: 'More organisation, easier to find items' },
            { id: 'few-large',  name: 'Few Large Drawers',  description: 'Cleaner look, easier to access' },
            { id: 'mixed',      name: 'Mixed Sizes',        description: 'Balanced approach, most flexible' },
          ].map((option) => (
            <motion.button
              key={option.id} whileHover={{ scale: 1.01 }}
              onClick={() => updateStyle('drawerPreference', option.id)}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                config.userInfo?.drawerPreference === option.id
                  ? 'border-taupe-400 bg-taupe-50'
                  : 'border-cream-200 hover:border-cream-300'
              }`}
            >
              <div className="font-medium text-charcoal-600">{option.name}</div>
              <div className="text-sm text-charcoal-400 mt-1">{option.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-medium text-charcoal-600 mb-4">Storage Priorities</h4>
        <div className="space-y-2">
          {[
            { id: 'shoes',       name: 'Shoe Storage',   icon: '👠' },
            { id: 'hanging',     name: 'Hanging Space',  icon: '👔' },
            { id: 'folded',      name: 'Folded Items',   icon: '👕' },
            { id: 'accessories', name: 'Accessories',    icon: '👜' },
          ].map((priority) => {
            const isSelected = config.userInfo?.priorityItems?.includes(priority.id as UserPreferences['priorityItems'][number]);
            return (
              <motion.label
                key={priority.id} whileHover={{ scale: 1.01 }}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  isSelected ? 'border-taupe-400 bg-taupe-50' : 'border-cream-200 hover:border-cream-300'
                }`}
              >
                <input
                  type="checkbox" checked={!!isSelected}
                  onChange={(e) => {
                    const current = config.userInfo?.priorityItems ?? [];
                    const updated = e.target.checked
                      ? [...current, priority.id]
                      : current.filter((item) => item !== priority.id);
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

  const renderLightingTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-charcoal-400">Select the lighting fixtures to include in your closet plan. Enabled fixtures will appear in the elevation drawing.</p>
      {LIGHTING_OPTIONS.map(({ key, label, desc, icon }) => {
        const isOn = config.lighting?.[key] ?? false;
        return (
          <motion.button
            key={key} whileHover={{ scale: 1.01 }}
            onClick={() => updateLighting(key, !isOn)}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              isOn ? 'border-amber-300 bg-amber-50' : 'border-cream-200 hover:border-cream-300'
            }`}
          >
            <span className="text-2xl mt-0.5">{icon}</span>
            <div className="flex-1">
              <div className={`font-medium text-sm ${isOn ? 'text-amber-800' : 'text-charcoal-600'}`}>{label}</div>
              <div className="text-xs text-charcoal-400 mt-0.5">{desc}</div>
            </div>
            <div className={`w-10 h-5 rounded-full transition-all flex-shrink-0 mt-1 ${isOn ? 'bg-amber-400' : 'bg-cream-300'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </motion.button>
        );
      })}
      {(config.lighting?.underShelfLED || config.lighting?.overheadRail || config.lighting?.puckLights || config.lighting?.islandPendant) && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ✓ Lighting specification will appear in the elevation drawing and PDF export.
        </p>
      )}
    </div>
  );

  const renderRoomTab = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium text-charcoal-600 mb-1">Wall Colour</h4>
        <p className="text-xs text-charcoal-400 mb-4">Sets the background wall tint in the elevation drawing.</p>
        <div className="grid grid-cols-6 gap-2">
          {WALL_COLOURS.map(({ name, value, hex, border }) => (
            <motion.button
              key={name} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
              onClick={() => updateRoomContext('wallColor', value)}
              title={name}
              className={`w-10 h-10 rounded-lg border-2 transition-all ${
                config.roomContext?.wallColor === value
                  ? 'border-taupe-500 shadow-md ring-2 ring-taupe-200'
                  : (border ?? 'border-cream-200')
              }`}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        {config.roomContext?.wallColor && (
          <p className="text-xs text-charcoal-400 mt-2">
            Selected: {WALL_COLOURS.find((c) => c.value === config.roomContext?.wallColor)?.name ?? 'Custom'}
          </p>
        )}
      </div>

      <div>
        <h4 className="font-medium text-charcoal-600 mb-1">Floor Material</h4>
        <p className="text-xs text-charcoal-400 mb-4">Adds a floor strip below the closet in the drawing.</p>
        <div className="grid grid-cols-3 gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => updateRoomContext('floorType', undefined)}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              !config.roomContext?.floorType ? 'border-taupe-400 bg-taupe-50' : 'border-cream-200 hover:border-cream-300'
            }`}
          >
            <div className="w-full h-8 rounded mb-2 bg-cream-100 border border-dashed border-cream-300" />
            <p className="text-xs font-medium text-charcoal-600">None</p>
          </motion.button>
          {FLOOR_TYPES.map(({ id, label, preview }) => (
            <motion.button
              key={id} whileHover={{ scale: 1.02 }}
              onClick={() => updateRoomContext('floorType', id)}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                config.roomContext?.floorType === id ? 'border-taupe-400 bg-taupe-50' : 'border-cream-200 hover:border-cream-300'
              }`}
            >
              <div className={`w-full h-8 rounded mb-2 ${preview}`} />
              <p className="text-xs font-medium text-charcoal-600">{label}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );

  const tabs: { id: ActiveTab; name: string; icon: string }[] = [
    { id: 'materials', name: 'Materials', icon: '🎨' },
    { id: 'colors',    name: 'Style',     icon: '✨' },
    { id: 'layout',    name: 'Layout',    icon: '📐' },
    { id: 'lighting',  name: 'Lighting',  icon: '💡' },
    { id: 'room',      name: 'Room',      icon: '🏠' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-cream-200 p-6 mt-6">
      <h3 className="font-serif text-xl text-charcoal-600 mb-6">Customize Your Style</h3>

      <div className="flex gap-1 mb-6 bg-cream-100 rounded-lg p-1 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-charcoal-600 shadow-sm' : 'text-charcoal-400 hover:text-charcoal-500'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>{tab.name}
          </motion.button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === 'materials' && renderMaterialsTab()}
        {activeTab === 'colors'    && renderColorsTab()}
        {activeTab === 'layout'    && renderLayoutTab()}
        {activeTab === 'lighting'  && renderLightingTab()}
        {activeTab === 'room'      && renderRoomTab()}
      </motion.div>

      <div className="mt-6 pt-6 border-t border-cream-200">
        <h5 className="font-medium text-charcoal-600 mb-3">Current Selection</h5>
        <div className="text-sm text-charcoal-500 space-y-1">
          <p>Style: {config.userInfo?.stylePreference || 'Not selected'}</p>
          <p>Wood Finish: {config.userInfo?.woodFinish || 'Not selected'}</p>
          <p>Drawers: {config.userInfo?.drawerPreference || 'Not selected'}</p>
          <p>Priorities: {config.userInfo?.priorityItems?.join(', ') || 'None selected'}</p>
          {config.lighting && Object.values(config.lighting).some(Boolean) && (
            <p>Lighting: {Object.entries(config.lighting).filter(([, v]) => v).map(([k]) => k).join(', ')}</p>
          )}
          {config.roomContext?.wallColor && <p>Wall colour: {config.roomContext.wallColor}</p>}
          {config.roomContext?.floorType && <p>Floor: {config.roomContext.floorType}</p>}
        </div>
      </div>
    </div>
  );
}

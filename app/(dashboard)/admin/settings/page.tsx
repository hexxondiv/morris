// app/admin/settings/page.tsx - Enhanced settings admin panel

"use client";

import React, { useState, useEffect, DragEvent } from "react";
import {
  Settings, Save, RotateCcw, Search, Eye, EyeOff, Shield, Globe,
  Users, DollarSign, Wallet, TrendingUp, MapPin, Loader2, GripVertical,
  Plus, X, Image as ImageIcon, RefreshCcw, Lock, Clock, Database,
  AlertTriangle, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Setting } from "@/types/settings";
import { useAdminSettings, useSettingValidation } from "@/hooks/use-settings";

// Keep your existing interfaces
interface DashboardMetrics {
  activeVillagers: number;
  monthlyContributions: number;
  cashOnHand: number;
  monthlyFixedCosts: number;
  cashDeployed: number;
}

interface MarqueeItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image: string;
  status: string;
  goal_amount: number;
  current_amount: number;
  created_at: string;
}

interface FeaturedItem {
  id: string;
  type: "project" | "metric";
  order: number;
  title?: string;
  cover_image?: string;
  label?: string;
  metric_type?: string;
}

const SettingsManager: React.FC = () => {
  // Enhanced hooks with proper types
  const {
    settings,
    categories,
    filteredSettings,
    groupedSettings,
    activeCategory,
    searchTerm,
    showSensitive,
    hasChanges,
    loading,
    saving,
    error,
    updateSetting,
    saveAllSettings,
    resetSetting,
    setActiveCategory,
    setSearchTerm,
    setShowSensitive,
    clearError,
    getSetting,
  } = useAdminSettings();

  const { validate, getValidationResult, hasErrors, clearValidation } = useSettingValidation();

  // Keep your existing state for projects and featured items
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [featuredItems, setFeaturedItems] = useState<FeaturedItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<any>(null);

  // Keep your existing marquee options
  const marqueeMetricOptions: MarqueeItem[] = [
    { id: "active_villagers", label: "Active Villagers", icon: Users },
    { id: "monthly_contributions", label: "Monthly Contributions", icon: DollarSign },
    { id: "cash_on_hand", label: "Cash on Hand", icon: Wallet },
    { id: "monthly_operational_costs", label: "Monthly Operational Costs", icon: TrendingUp },
    { id: "cash_deployed", label: "Cash Deployed", icon: MapPin },
  ];

  // Fetch available projects
  async function fetchAvailableProjects() {
    const params = new URLSearchParams({
      statuses: "voting,active,completed",
      paginate: "false",
      limit: "100",
      sortBy: "created_at",
      sortOrder: "desc",
    });

    try {
      const response = await fetch(`/api/projects?${params}`);
      if (!response.ok) {
        toast.error("Failed to fetch projects");
        throw new Error("Failed to fetch projects");
      }
      const data = await response.json();
      setAvailableProjects(data.data);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to fetch projects");
    }
  }

  // Initialize featured items
  useEffect(() => {
    const featuredItemsSetting = settings.find(s => s.key === "marquee_featured_items");
    if (featuredItemsSetting?.value) {
      try {
        const featured = JSON.parse(featuredItemsSetting.value || "[]");
        setFeaturedItems(featured);
      } catch (error) {
        console.error("Error parsing featured items:", error);
        setFeaturedItems([]);
      }
    }
  }, [settings]);

  // Get categories with "All" option
  const allCategories = ["All", ...categories.map(c => c.category)];

  // Get current metrics data source
  const metricsDataSource = getSetting("metrics_data_source") || "calculated";
  const isManualMetrics = metricsDataSource === "manual";

  // Enhanced setting change handler with validation
  const handleSettingChange = async (key: string, newValue: string) => {
    updateSetting(key, newValue);
    clearValidation(key);

    // Validate in real-time
    try {
      await validate(key, newValue);
    } catch (error) {
      console.warn("Validation error:", error);
    }
  };

  const handleReset = (key: string) => {
    resetSetting(key);
    clearValidation(key);
  };

  // Keep your existing drag and drop logic
  const handleDragStart = (e: DragEvent, item: any, type: "project" | "metric" | "featured") => {
    setDraggedItem({ ...item, type });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.type === "featured") {
      const newItems = [...featuredItems];
      const draggedIndex = newItems.findIndex(
        (item) => item.id === draggedItem.id && item.type === draggedItem.originalType
      );
      const [draggedFeaturedItem] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, draggedFeaturedItem);

      const updatedItems = newItems.map((item, index) => ({
        ...item,
        order: index,
      }));

      setFeaturedItems(updatedItems);
      updateFeaturedItemsSetting(updatedItems);
    }
    setDraggedItem(null);
  };

  // Keep your existing featured items management
  const addFeaturedProject = (project: Project) => {
    const newItem: FeaturedItem = {
      id: project.id,
      type: "project",
      order: featuredItems.length,
      title: project.title,
      cover_image: project.cover_image,
    };

    const updatedItems = [...featuredItems, newItem];
    setFeaturedItems(updatedItems);
    updateFeaturedItemsSetting(updatedItems);
  };

  const removeFeaturedItem = (itemId: string, itemType: "project" | "metric") => {
    const updatedItems = featuredItems
      .filter((item) => !(item.id === itemId && item.type === itemType))
      .map((item, index) => ({ ...item, order: index }));

    setFeaturedItems(updatedItems);
    updateFeaturedItemsSetting(updatedItems);
  };

  const addFeaturedMetric = (metricId: string) => {
    const metric = marqueeMetricOptions.find((m) => m.id === metricId);
    if (!metric) return;

    const newItem: FeaturedItem = {
      id: metricId,
      type: "metric",
      order: featuredItems.length,
      label: metric.label,
      metric_type: metricId,
    };

    const updatedItems = [...featuredItems, newItem];
    setFeaturedItems(updatedItems);
    updateFeaturedItemsSetting(updatedItems);
  };

  const updateFeaturedItemsSetting = (items: FeaturedItem[]) => {
    handleSettingChange("marquee_featured_items", JSON.stringify(items));
  };

  // Enhanced save handler
  const handleSave = async () => {
    try {
      await saveAllSettings();
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    }
  };

  const formatCurrency = (amount: number): string => {
    const currency = getSetting("default_currency") || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "NGN" ? "NGN" : "USD",
    }).format(amount);
  };

  // Get select options from validation rules
  const getSelectOptions = (setting: Setting): string[] | null => {
    if (setting.validation_rules?.enum) {
      return setting.validation_rules.enum;
    }
    return null;
  };

  // Enhanced badge system
  const getAccessLevelBadge = (setting: Setting) => {
    const accessLevel = setting.access_level || (setting.is_encrypted ? 'sensitive' : 'public');
    
    switch (accessLevel) {
      case 'public':
        return <Badge variant="default" className="gap-1"><Globe className="w-3 h-3" />Public</Badge>;
      case 'protected':
        return <Badge variant="secondary" className="gap-1"><Shield className="w-3 h-3" />Protected</Badge>;
      case 'sensitive':
        return <Badge variant="destructive" className="gap-1"><Lock className="w-3 h-3" />Sensitive</Badge>;
      default:
        return null;
    }
  };

  const getCacheStrategyBadge = (setting: Setting) => {
    const strategy = setting.cache_strategy;
    if (!strategy) return null;
    
    switch (strategy) {
      case 'static':
        return <Badge variant="outline" className="gap-1"><Database className="w-3 h-3" />Static</Badge>;
      case 'dynamic':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Dynamic</Badge>;
      case 'realtime':
        return <Badge variant="outline" className="gap-1"><RefreshCcw className="w-3 h-3" />Realtime</Badge>;
      default:
        return null;
    }
  };

  // Keep your existing featured items selector (shortened for space)
  const renderFeaturedItemsSelector = () => {
    return (
      <div className="space-y-6">
        {/* Featured Items Display */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Featured Items (Drag to reorder)</h4>
          {featuredItems.length === 0 ? (
            <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
              No featured items selected. Add projects or metrics below.
            </div>
          ) : (
            <div className="space-y-2">
              {featuredItems
                .sort((a, b) => a.order - b.order)
                .map((item, index) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, { ...item, originalType: item.type }, "featured")}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-move hover:border-theme-300 transition-colors"
                  >
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    {item.type === "project" ? (
                      <div className="flex items-center gap-3 flex-1">
                        {item.cover_image ? (
                          <img src={item.cover_image} alt={item.title || ""} className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.title}</div>
                          <div className="text-sm text-gray-500">Project • Order: {index + 1}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 bg-theme-100 rounded-lg">
                          {React.createElement(marqueeMetricOptions.find(m => m.id === item.id)?.icon || MapPin, { className: "w-4 h-4 text-theme-600" })}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{item.label}</div>
                          <div className="text-sm text-gray-500">Metric • Order: {index + 1}</div>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => removeFeaturedItem(item.id, item.type)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Available Projects Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900">Available Projects</h4>
            <Button onClick={fetchAvailableProjects} size="sm" variant="outline">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {availableProjects
              .filter(project => !featuredItems.some(item => item.type === "project" && item.id === project.id))
              .slice(0, 10) // Limit for performance
              .map((project) => (
                <div key={project.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 transition-colors">
                  {project.cover_image ? (
                    <img src={project.cover_image} alt={project.title} className="w-12 h-12 object-cover rounded-lg" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{project.title}</div>
                    <div className="text-sm text-gray-500 truncate">{project.description}</div>
                  </div>
                  <button
                    onClick={() => addFeaturedProject(project)}
                    className="p-2 text-theme-600 hover:bg-theme-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>

        {/* Available Metrics Section */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Available Metrics</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {marqueeMetricOptions
              .filter(option => !featuredItems.some(item => item.type === "metric" && item.id === option.id))
              .map((option) => (
                <button
                  key={option.id}
                  onClick={() => addFeaturedMetric(option.id)}
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg hover:bg-gray-100 hover:border-theme-300 transition-colors text-left"
                >
                  <div className="p-2 bg-theme-100 rounded-lg">
                    {React.createElement(option.icon, { className: "w-4 h-4 text-theme-600" })}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                  </div>
                  <Plus className="w-4 h-4 text-theme-600" />
                </button>
              ))}
          </div>
        </div>
      </div>
    );
  };

  // Enhanced input renderer with validation
  const renderInput = (setting: Setting) => {
    const baseClasses = "w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-theme-500 focus:ring-2 focus:ring-theme-500/20 transition-all duration-200 bg-white";
    
    const validationResult = getValidationResult(setting.key);
    const hasValidationErrors = hasErrors(setting.key);
    
    const inputClasses = `${baseClasses} ${hasValidationErrors ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : ''}`;

    // Handle special settings
    if (setting.key === "marquee_featured_items") {
      return renderFeaturedItemsSelector();
    }

    // Handle enum options
    const selectOptions = getSelectOptions(setting);
    if (selectOptions && selectOptions.length > 0) {
      return (
        <select
          value={setting.value}
          onChange={(e) => handleSettingChange(setting.key, e.target.value)}
          className={inputClasses}
        >
          {selectOptions.map((option) => (
            <option key={option} value={option}>
              {option === "calculated" ? "Auto-calculated from data" :
               option === "manual" ? "Manual input" : option}
            </option>
          ))}
        </select>
      );
    }

    switch (setting.data_type) {
      case "boolean":
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value === "true"}
              onChange={(e) => handleSettingChange(setting.key, e.target.checked.toString())}
              className="sr-only peer"
            />
            <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-theme-500 peer-focus:ring-2 peer-focus:ring-theme-500/20 transition-all duration-200">
              <div className="absolute top-0.5 left-0.5 bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform duration-200 peer-checked:translate-x-5 peer-checked:border-theme-500"></div>
            </div>
          </label>
        );

      case "number":
        const validationRules = setting.validation_rules || {};
        return (
          <input
            type="number"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={inputClasses}
            step={validationRules.step || (setting.key.includes("percentage") ? "0.1" : setting.key.includes("amount") ? "0.01" : "1")}
            min={validationRules.min}
            max={validationRules.max}
          />
        );

      case "email":
        return (
          <input
            type="email"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={inputClasses}
          />
        );

      case "url":
        return (
          <input
            type="url"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={inputClasses}
          />
        );

      case "color":
        return (
          <input
            type="color"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="w-16 h-12 rounded-lg border border-gray-200 cursor-pointer"
          />
        );

      case "json":
        return (
          <textarea
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={`${inputClasses} min-h-[100px] font-mono text-sm`}
            placeholder="JSON format"
          />
        );

      default:
        return (
          <input
            type="text"
            value={setting.value}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className={inputClasses}
            minLength={setting.validation_rules?.minLength}
            maxLength={setting.validation_rules?.maxLength}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-theme-50 p-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-theme-500" />
          <span className="text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-theme-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-red-200 p-6 max-w-md">
          <div className="text-red-600 font-semibold mb-2">Error Loading Settings</div>
          <div className="text-gray-600 text-sm mb-4">{error}</div>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-theme-500 text-white rounded-lg hover:bg-theme-600 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={clearError}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-theme-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-theme-500 rounded-xl text-white">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings Management</h1>
              <p className="text-gray-600 mt-1">Configure your crowdfunding platform</p>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div className="text-red-800 font-medium">Error</div>
              </div>
              <div className="text-red-600 text-sm mt-1">{error}</div>
            </div>
          )}

          {/* Search and Actions */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-theme-500 focus:ring-2 focus:ring-theme-500/20 transition-all duration-200"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSensitive(!showSensitive)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:border-theme-300 transition-colors"
              >
                {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showSensitive ? "Hide" : "Show"} Technical
              </button>

              {hasChanges && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-theme-500 text-white rounded-lg hover:bg-theme-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 p-2">
              <nav className="space-y-1">
                {allCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      activeCategory === category
                        ? "bg-theme-500 text-white shadow-md"
                        : "text-gray-600 hover:bg-theme-50 hover:text-theme-700"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="space-y-6">
              {Object.entries(groupedSettings).map(([subcategory, settingsGroup]) => (
                <div
                  key={subcategory}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="bg-theme-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-theme-800">{subcategory}</h3>
                  </div>

                  <div className="p-6 space-y-6">
                    {settingsGroup
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((setting) => {
                        const validationResult = getValidationResult(setting.key);
                        const hasValidationErrors = hasErrors(setting.key);

                        return (
                          <div
                            key={setting.key}
                            className={`flex flex-col lg:flex-row lg:items-start gap-4 p-4 rounded-lg border transition-colors ${
                              hasValidationErrors
                                ? 'border-red-200 bg-red-50/50'
                                : 'border-gray-100 hover:border-theme-200'
                            }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h4 className="font-semibold text-gray-900">{setting.display_name}</h4>
                                <div className="flex gap-1 flex-wrap">
                                  {getAccessLevelBadge(setting)}
                                  {getCacheStrategyBadge(setting)}
                                </div>
                              </div>
                              <p className="text-gray-600 text-sm leading-relaxed mb-2">{setting.description}</p>

                              {setting.value !== setting.default_value && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Default: {setting.default_value}
                                </p>
                              )}

                              {/* Validation feedback */}
                              {hasValidationErrors && validationResult && (
                                <div className="mt-2 text-sm text-red-600">
                                  {validationResult.errors.map((error, index) => (
                                    <div key={index} className="flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      {error}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Success feedback */}
                              {validationResult && validationResult.valid && setting.value !== setting.default_value && (
                                <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Valid
                                </div>
                              )}
                            </div>

                            <div className="lg:w-80 flex gap-2">
                              <div className="flex-1">{renderInput(setting)}</div>
                              {!["marquee_featured_items"].includes(setting.key) && setting.data_type !== "json" && (
                                <button
                                  onClick={() => handleReset(setting.key)}
                                  disabled={setting.value === setting.default_value}
                                  className="p-3 rounded-lg border border-gray-200 hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Reset to default"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}

              {filteredSettings.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="text-gray-400 mb-2">No settings found</div>
                  <div className="text-gray-600 text-sm">
                    {searchTerm
                      ? "Try adjusting your search terms"
                      : "No settings available in this category"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating save notification */}
        {hasChanges && (
          <div className="fixed bottom-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">You have unsaved changes</span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-theme-500 text-white text-sm rounded-lg hover:bg-theme-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save Now"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsManager;
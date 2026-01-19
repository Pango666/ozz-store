// public/js/pages/homeContent.js
// Script para cargar contenido dinámico del home desde settings

import { supabase } from '../supabaseClient.js';

export async function loadHomeContent() {
    try {
        const storeSlug = window.__ENV?.STORE_SLUG || 'tech-boutique';

        // Get store ID
        const { data: store } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', storeSlug)
            .single();

        if (!store) return;

        // Get all home content settings
        const { data: settings } = await supabase
            .from('settings')
            .select('key, value')
            .eq('store_id', store.id)
            .like('key', 'home_%');

        if (!settings?.length) return;

        const config = {};
        settings.forEach(s => { config[s.key] = s.value; });

        // Apply Hero content
        applyTextContent('hero-badge', config.home_hero_badge);
        applyHeroTitle(config.home_hero_title);
        applyTextContent('hero-description', config.home_hero_description);
        applyBackgroundImage('hero-image', config.home_hero_image);
        applyTextContent('hero-stat1-value', config.home_hero_stat1_value);
        applyTextContent('hero-stat1-label', config.home_hero_stat1_label);
        applyTextContent('hero-stat2-value', config.home_hero_stat2_value);
        applyTextContent('hero-stat2-label', config.home_hero_stat2_label);
        applyTextContent('hero-stat3-value', config.home_hero_stat3_value);
        applyTextContent('hero-stat3-label', config.home_hero_stat3_label);

        // Apply Tech section content
        applyTextContent('tech-title', config.home_tech_title);
        applyTechDescription(config.home_tech_description);
        applyBackgroundImage('tech-image', config.home_tech_image);
        
        // Features
        applyIconContent('tech-feature1-icon', config.home_tech_feature1_icon);
        applyTextContent('tech-feature1-title', config.home_tech_feature1_title);
        applyTextContent('tech-feature1-desc', config.home_tech_feature1_desc);
        applyIconContent('tech-feature2-icon', config.home_tech_feature2_icon);
        applyTextContent('tech-feature2-title', config.home_tech_feature2_title);
        applyTextContent('tech-feature2-desc', config.home_tech_feature2_desc);
        applyIconContent('tech-feature3-icon', config.home_tech_feature3_icon);
        applyTextContent('tech-feature3-title', config.home_tech_feature3_title);
        applyTextContent('tech-feature3-desc', config.home_tech_feature3_desc);

        // Stats
        applyTextContent('tech-stat1-value', config.home_tech_stat1_value);
        applyTextContent('tech-stat1-label', config.home_tech_stat1_label);
        applyTextContent('tech-stat2-value', config.home_tech_stat2_value);
        applyTextContent('tech-stat2-label', config.home_tech_stat2_label);
        applyTextContent('tech-stat3-value', config.home_tech_stat3_value);
        applyTextContent('tech-stat3-label', config.home_tech_stat3_label);

    } catch (err) {
        console.log('Home content not loaded from settings:', err.message);
    }
}

function applyTextContent(elementId, value) {
    if (!value) return;
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
}

function applyHeroTitle(value) {
    if (!value) return;
    const el = document.getElementById('hero-title');
    if (!el) return;
    
    // Keep the gradient text effect - look for "Premium" or similar word
    const parts = value.split(/\s+/);
    if (parts.length > 1) {
        // Find emphasized word (common ones: Premium, Pro, Plus, etc.)
        const emphasisWords = ['Premium', 'Pro', 'Plus', 'Ultimate', 'Gaming'];
        let emphasisIndex = parts.findIndex(p => emphasisWords.includes(p));
        
        if (emphasisIndex === -1) emphasisIndex = 1; // Default to second word
        
        const beforeEmphasis = parts.slice(0, emphasisIndex).join(' ');
        const emphasisWord = parts[emphasisIndex];
        const afterEmphasis = parts.slice(emphasisIndex + 1).join(' ');
        
        el.innerHTML = `${beforeEmphasis} <span class="gradient-text">${emphasisWord}</span><br>${afterEmphasis}`;
    } else {
        el.textContent = value;
    }
}

function applyTechDescription(value) {
    if (!value) return;
    const el = document.getElementById('tech-description');
    if (!el) return;
    
    // Simple HTML sanitization but allow basic formatting
    el.innerHTML = value
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*([^*]+)\*\*/g, '<span class="font-bold">$1</span>')
        .replace(/\n/g, '<br>');
}

function applyBackgroundImage(elementId, value) {
    if (!value) return;
    const el = document.getElementById(elementId);
    if (el) el.style.backgroundImage = `url("${value}")`;
}

function applyIconContent(elementId, value) {
    if (!value) return;
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
}

// Auto-load on page
loadHomeContent();

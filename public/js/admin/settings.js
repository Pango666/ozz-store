// public/js/admin/settings.js
import { requireAdmin, getCurrentStore } from "./auth.js";
import { initLayout, toast, escapeHtml } from "./layout.js";
import { supabase } from "../supabaseClient.js";

let settings = [];

async function init() {
    const access = await requireAdmin();
    if (!access) return;
    await initLayout();

    loadStoreInfo();
    await loadSettings();
    setupEventListeners();
}

function loadStoreInfo() {
    const store = getCurrentStore();
    document.getElementById("store_name").value = store.name || "";
    document.getElementById("store_slug").value = store.slug || "";
    document.getElementById("store_currency").value = store.currency || "BOB";
}

async function loadSettings() {
    const store = getCurrentStore();
    const container = document.getElementById("settings-list");

    try {
        const { data, error } = await supabase
            .from("settings")
            .select("*")
            .eq("store_id", store.id)
            .order("key");

        if (error) throw error;

        settings = data || [];

        if (!settings.length) {
            container.innerHTML = `<p class="text-gray-400 text-sm">No hay configuraciones personalizadas</p>`;
            return;
        }

        renderSettings();

    } catch (err) {
        console.error("Error loading settings:", err);
        container.innerHTML = `<p class="text-red-500 text-sm">Error: ${err.message}</p>`;
    }
}

function renderSettings() {
    const container = document.getElementById("settings-list");

    if (!settings.length) {
        container.innerHTML = `<p class="text-gray-400 text-sm">No hay configuraciones personalizadas</p>`;
        return;
    }

    container.innerHTML = settings.map((s, i) => `
    <div class="flex gap-3 items-start">
      <div class="flex-1">
        <input type="text" value="${escapeHtml(s.key)}" data-index="${i}" data-field="key"
               class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Clave">
      </div>
      <div class="flex-1">
        <input type="text" value="${escapeHtml(s.value || '')}" data-index="${i}" data-field="value"
               class="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Valor">
      </div>
      <button type="button" onclick="removeSetting(${i})" class="p-2 text-red-500 hover:bg-red-50 rounded">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join("");

    // Add input listeners
    container.querySelectorAll("input").forEach(input => {
        input.addEventListener("change", (e) => {
            const index = parseInt(e.target.dataset.index);
            const field = e.target.dataset.field;
            settings[index][field] = e.target.value;
        });
    });
}

function setupEventListeners() {
    document.getElementById("btn-add-setting").addEventListener("click", () => {
        settings.push({ key: "", value: "", id: null });
        renderSettings();
    });

    document.getElementById("settings-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        await saveSettings();
    });
}

window.removeSetting = function (index) {
    settings.splice(index, 1);
    renderSettings();
};

async function saveSettings() {
    const store = getCurrentStore();
    const btn = document.getElementById("btn-save");

    try {
        btn.disabled = true;
        btn.textContent = "Guardando...";

        // Filter out empty keys
        const validSettings = settings.filter(s => s.key?.trim());

        // Delete all existing settings for this store
        await supabase
            .from("settings")
            .delete()
            .eq("store_id", store.id);

        // Insert new settings
        if (validSettings.length > 0) {
            const { error } = await supabase
                .from("settings")
                .insert(validSettings.map(s => ({
                    store_id: store.id,
                    key: s.key.trim(),
                    value: s.value?.trim() || null
                })));

            if (error) throw error;
        }

        toast("Configuración guardada", "success");
        await loadSettings();

    } catch (err) {
        console.error("Error saving settings:", err);
        toast("Error: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Guardar cambios";
    }
}

init();

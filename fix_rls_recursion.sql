-- =====================================================
-- FIX AGRESIVO: ELIMINAR TODA RECURSIÓN RLS
-- Ejecuta COMPLETO en Supabase SQL Editor
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas de stores y store_members
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    -- Eliminar políticas de stores
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'stores' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON stores', pol.policyname);
    END LOOP;
    
    -- Eliminar políticas de store_members
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'store_members' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON store_members', pol.policyname);
    END LOOP;
END $$;

-- PASO 2: Crear políticas SIMPLES que NO causan recursión

-- store_members: Solo el usuario puede ver sus propias membresías
-- Esta política NO hace ningún JOIN ni llama funciones
CREATE POLICY "store_members_select" ON store_members 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "store_members_insert" ON store_members 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "store_members_update" ON store_members 
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "store_members_delete" ON store_members 
FOR DELETE USING (user_id = auth.uid());

-- stores: Lectura pública (sin condiciones que requieran consultar store_members)
-- Esto permite el JOIN sin recursión
CREATE POLICY "stores_select_public" ON stores 
FOR SELECT USING (true);  -- Cualquiera puede leer tiendas

-- Para escritura en stores, usamos condición directa sin función
CREATE POLICY "stores_update" ON stores 
FOR UPDATE USING (
    id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
);

CREATE POLICY "stores_delete" ON stores 
FOR DELETE USING (
    id IN (SELECT store_id FROM store_members WHERE user_id = auth.uid())
);

-- =====================================================
-- VERIFICACIÓN (ejecuta después para probar)
-- =====================================================
-- SELECT * FROM store_members;
-- SELECT * FROM stores;

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      currentOfficer: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      // Verify employee exists (without PIN check) - for login step 1
      verifyEmployee: async (barcode) => {
        try {
          const { data: employee, error } = await supabase
            .from('employees')
            .select('*')
            .eq('barcode', barcode)
            .eq('status', 'active')
            .single()

          if (error || !employee) {
            return null
          }

          // Check if has valid role
          if (!['security_control', 'security_gate', 'admin', 'supervisor'].includes(employee.role)) {
            return null
          }

          return employee
        } catch (error) {
          return null
        }
      },

      // Login with barcode and PIN
      loginWithBarcode: async (barcode, pin) => {
        set({ loading: true, error: null })
        
        try {
          // Find employee by barcode AND PIN
          const { data: employee, error: empError } = await supabase
            .from('employees')
            .select('*')
            .eq('barcode', barcode)
            .eq('pin', pin)
            .eq('status', 'active')
            .single()

          if (empError || !employee) {
            set({ loading: false, error: 'Invalid barcode or PIN' })
            return false
          }

          // Verify role
          if (!['security_control', 'security_gate', 'admin', 'supervisor'].includes(employee.role)) {
            set({ loading: false, error: 'Access denied. Invalid role.' })
            return false
          }

          set({ 
            currentOfficer: employee, 
            isAuthenticated: true, 
            loading: false 
          })
          return true
        } catch (error) {
          set({ loading: false, error: error.message })
          return false
        }
      },

      // Logout
      logout: async () => {
        set({ 
          currentOfficer: null,
          isAuthenticated: false,
          error: null
        })
      },

      // Clear error
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)
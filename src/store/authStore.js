import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  currentOfficer: null,
  isAuthenticated: false,
  loading: false,
  error: null,
// Login with barcode
loginWithBarcode: async (barcode) => {
  set({ loading: true, error: null })
  
  try {
    console.log('Looking for employee with barcode:', barcode)
    console.log('Barcode length:', barcode.length)
    console.log('Barcode characters:', barcode.split('').map(c => c.charCodeAt(0)))
    // Find employee by barcode
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('barcode', barcode)
      .eq('status', 'active')
      .single()
          console.log('Query result:', employee)
    console.log('Query error:', empError)

    if (empError || !employee) {
      throw new Error('Employee not found or inactive')
    }

    // Check if employee is security officer
    if (!['security_control', 'security_gate', 'supervisor', 'admin'].includes(employee.role)) {
      throw new Error('Only security officers can log in to this system')
    }

    set({ 
      currentOfficer: employee,
      isAuthenticated: true,
      loading: false,
      error: null
    })

    return { success: true, officer: employee }
  } catch (error) {
    set({ loading: false, error: error.message })
    return { success: false, error: error.message }
  }
},

  // Logout
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
}))
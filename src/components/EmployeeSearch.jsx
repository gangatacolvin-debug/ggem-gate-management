import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export default function EmployeeSearch({ onSelect, disabled = false, roleFilter = null, label = "Search Employee" }) {
  const [open, setOpen] = useState(false)
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [roleFilter])

  const fetchEmployees = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('employees')
        .select('*')
        .eq('status', 'active')
        .order('name')

      if (roleFilter) {
        query = query.in('role', Array.isArray(roleFilter) ? roleFilter : [roleFilter])
      }

      const { data, error } = await query

      if (error) throw error
      setEmployees(data || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (employee) => {
    setSelectedEmployee(employee)
    setOpen(false)
    onSelect(employee)
  }

  const handleClear = () => {
    setSelectedEmployee(null)
    onSelect(null)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {selectedEmployee ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 p-3 border rounded-lg bg-green-50 border-green-200">
            <div className="font-medium">{selectedEmployee.name}</div>
            <div className="text-sm text-muted-foreground">
              {selectedEmployee.role.replace('_', ' ')} - {selectedEmployee.department}
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-start text-left font-normal"
              disabled={disabled}
            >
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              {loading ? 'Loading...' : 'Search by name...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command>
              <CommandInput placeholder="Type name to search..." />
              <CommandList>
                <CommandEmpty>No employee found.</CommandEmpty>
                <CommandGroup>
                  {employees.map((employee) => (
                    <CommandItem
                      key={employee.id}
                      value={employee.name}
                      onSelect={() => handleSelect(employee)}
                    >
                      <div className="flex flex-col">
                        <div className="font-medium">{employee.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.role.replace('_', ' ')} - {employee.department}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
-- Add assigned_employee_id column to appointments table
-- This allows tracking which employee is assigned to handle the appointment

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES employees(id);

-- Add index for faster lookups by assigned employee
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_employee_id 
ON appointments(assigned_employee_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN appointments.assigned_employee_id IS '営担として割り当てられた社員のID';

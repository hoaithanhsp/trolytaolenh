// LocalStorage-based storage for instructions history

export interface Instruction {
    id: string;
    user_idea: string;
    category: string;
    title: string;
    generated_instruction: string;
    html_template: string;
    created_at: string;
}

export interface NewInstruction {
    user_idea: string;
    category: string;
    title: string;
    generated_instruction: string;
    html_template: string;
}

const STORAGE_KEY = 'instructions_history';
const MAX_HISTORY_ITEMS = 20; // Giới hạn số lượng lịch sử

// Generate unique ID
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get all instructions from localStorage
export function getInstructions(): Instruction[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading instructions from localStorage:', error);
        return [];
    }
}

// Save instruction to localStorage
export function saveInstruction(newInstruction: NewInstruction): Instruction {
    const instructions = getInstructions();

    const instruction: Instruction = {
        ...newInstruction,
        id: generateId(),
        created_at: new Date().toISOString()
    };

    // Add to beginning of array (newest first)
    instructions.unshift(instruction);

    // Limit history size
    if (instructions.length > MAX_HISTORY_ITEMS) {
        instructions.splice(MAX_HISTORY_ITEMS);
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(instructions));
    } catch (error) {
        console.error('Error saving instruction to localStorage:', error);
    }

    return instruction;
}

// Delete instruction from localStorage
export function deleteInstruction(id: string): boolean {
    try {
        const instructions = getInstructions();
        const filtered = instructions.filter(i => i.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
    } catch (error) {
        console.error('Error deleting instruction from localStorage:', error);
        return false;
    }
}

// Clear all history
export function clearAllInstructions(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing instructions from localStorage:', error);
    }
}

// Get instruction by ID
export function getInstructionById(id: string): Instruction | null {
    const instructions = getInstructions();
    return instructions.find(i => i.id === id) || null;
}

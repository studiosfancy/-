
export enum ItemStatus {
  PENDING = 'PENDING',
  BOUGHT = 'BOUGHT'
}

export enum Page {
  DASHBOARD = 'DASHBOARD',
  SHOPPING_LIST = 'SHOPPING_LIST',
  SCANNER = 'SCANNER',
  HISTORY = 'HISTORY',
  FINANCE = 'FINANCE',
  PANTRY = 'PANTRY',
  MEAL_PLANNER = 'MEAL_PLANNER',
  TASKS = 'TASKS',
  SETTINGS = 'SETTINGS'
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  status: ItemStatus;
  dateAdded: string; 
  expiryDate?: string; 
  barcode?: string;
  imageUrl?: string;
  storeName?: string;
  tags?: string[];
}

export interface IncomeRecord {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
}

export interface RecurringItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  period: 'MONTHLY'; 
  dueDay: number;
  lastPaidDate?: string;
}

export interface HouseTask {
  id: string;
  title: string;
  category: 'CLEANING' | 'MAINTENANCE' | 'PLANTS' | 'CAR' | 'OTHER';
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  lastDone?: string;
  nextDue: string;
  isDoneToday: boolean;
}

export interface BudgetAnalysisResult {
    predictedMonthEnd: number;
    savingsSuggestion: string;
    unnecessaryExpenses: string[];
    financialHealthScore: number;
    advice: string;
}

export interface UserLevel {
    level: number;
    xp: number;
    nextLevelXp: number;
    title: string;
}

export interface ScannedProductData {
  name: string;
  category: string;
  estimatedPrice: number;
  barcode?: string;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  instructions: string[];
}

export interface MealPlan {
  id: string;
  day: string;
  type: 'LUNCH' | 'DINNER' | string;
  foodName: string;
  ingredients: string[];
  isCooked: boolean;
}

export interface HealthAnalysisResult {
  score: number;
  summary: string;
  positives: string[];
  negatives: string[];
  suggestions: string[];
}

export interface ChatAction {
  type: 'ADD_ITEM' | 'INFO' | 'NONE';
  textResponse: string;
  data?: Array<{
    name: string;
    category: string;
    quantity: number;
  }>;
}

export interface ReceiptResult {
  items: Omit<ShoppingItem, 'id'>[];
}

export interface BackupData {
    version: number;
    timestamp: string;
    items: ShoppingItem[];
    incomes: IncomeRecord[];
    mealPlan: any[];
    budget: number;
    recurringItems?: RecurringItem[];
    tasks?: HouseTask[];
}

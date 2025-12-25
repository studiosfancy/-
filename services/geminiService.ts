
import { GoogleGenAI, Type } from "@google/genai";
import { ScannedProductData, Recipe, MealPlan, ShoppingItem, IncomeRecord, HealthAnalysisResult, HouseTask, BudgetAnalysisResult, ChatAction, ReceiptResult, ItemStatus } from "../types";
import { CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Universal Vision Analyzer: Handles receipts, multiple products, or single items.
 */
export const analyzeImageUniversal = async (base64Image: string): Promise<{
  items: Omit<ShoppingItem, 'id'>[],
  storeName?: string,
  date?: string,
  totalAmount?: number,
  isReceipt: boolean
}> => {
  try {
    const base64Data = base64Image.includes(",") ? base64Image.split(",")[1] : base64Image;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: "image/jpeg", data: base64Data } },
            { text: `Analyze this image. It is either a shopping receipt (list of items already bought) or a photo of products (could be a wish list or inventory).
            
            1. Determine if this is a RECEIPT (فاکتور خرید) or just PRODUCT PHOTOS.
            2. Extract ALL individual items.
            3. For each: Name (Persian), Category (Strictly from: ${CATEGORIES.join(", ")}), Quantity, Price (Toman), and Barcode.
            4. If it's a receipt, identify: Store Name, Transaction Date (Jalali if possible), and the final Total Amount.
            5. Return as a clean JSON object.` },
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isReceipt: { type: Type.BOOLEAN },
            storeName: { type: Type.STRING },
            date: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  estimatedPrice: { type: Type.NUMBER },
                  barcode: { type: Type.STRING },
                },
                required: ["name", "category", "estimatedPrice"],
              }
            }
          },
          required: ["items", "isReceipt"],
        },
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      // If it's a receipt, default status is BOUGHT (Pantry), otherwise PENDING (Shopping List)
      const defaultStatus = data.isReceipt ? ItemStatus.BOUGHT : ItemStatus.PENDING;
      
      const processedItems = (data.items || []).map((it: any) => ({
        ...it,
        status: defaultStatus,
        dateAdded: new Date().toISOString(),
        quantity: it.quantity || 1,
        unit: 'عدد'
      }));
      
      return {
        items: processedItems,
        storeName: data.storeName,
        date: data.date,
        totalAmount: data.totalAmount,
        isReceipt: data.isReceipt
      };
    }
    return { items: [], isReceipt: false };
  } catch (error) {
    console.error("Universal Scan Error:", error);
    return { items: [], isReceipt: false };
  }
};

export const extractItemsFromReceipt = async (base64Image: string): Promise<Omit<ShoppingItem, 'id'>[]> => {
  const result = await analyzeImageUniversal(base64Image);
  return result.items;
};

export const identifyProductFromImage = async (base64Image: string): Promise<ScannedProductData> => {
  const result = await analyzeImageUniversal(base64Image);
  if (result.items.length > 0) {
    return {
      name: result.items[0].name,
      category: result.items[0].category,
      estimatedPrice: result.items[0].estimatedPrice,
      barcode: result.items[0].barcode
    };
  }
  return { name: "ناشناس", category: "سایر", estimatedPrice: 0 };
};

export const processUserChat = async (text: string, context: { items: ShoppingItem[]; incomes: IncomeRecord[] }): Promise<ChatAction> => {
  try {
    const itemSummary = context.items.map(i => `${i.name} (${i.status === 'BOUGHT' ? 'موجود در انبار' : 'در لیست خرید'})`).join(", ");
    const incomeTotal = context.incomes.reduce((acc, curr) => acc + curr.amount, 0);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a professional House Management Expert for an Iranian family.
      Context: [${itemSummary}]. Monthly Income: ${incomeTotal} Toman.
      Task: Reply to "${text}" in a helpful Persian tone. If adding items, use the ADD_ITEM type.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["ADD_ITEM", "INFO", "NONE"] },
            textResponse: { type: Type.STRING },
            data: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                },
                required: ["name", "category", "quantity"]
              } 
            },
          },
          required: ["type", "textResponse"],
        },
      },
    });
    return response.text ? JSON.parse(response.text) : { type: 'NONE', textResponse: "مشکلی پیش آمد." };
  } catch (error) {
    return { type: 'NONE', textResponse: "خطا در ارتباط." };
  }
};

export const findProductPrice = async (productName: string): Promise<number> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: { parts: [{ text: `Current average price of "${productName}" in Toman? Return only number.` }] },
            config: { tools: [{ googleSearch: {} }] }
        });
        const text = response.text?.replace(/,/g, '').match(/\d+/);
        let price = text ? parseInt(text[0], 10) : 0;
        return isNaN(price) ? 0 : price;
    } catch (error) { return 0; }
};

export const findProductImageOnline = async (productName: string): Promise<string | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: { parts: [{ text: `Direct image URL for "${productName}". Return only URL.` }] },
            config: { tools: [{ googleSearch: {} }] }
        });
        const urlMatch = response.text?.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|webp|gif)/i);
        return urlMatch ? urlMatch[0] : null;
    } catch (error) { return null; }
};

export const analyzeShoppingHealth = async (itemNames: string[]): Promise<HealthAnalysisResult> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze health of: ${itemNames.join(", ")}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            positives: { type: Type.ARRAY, items: { type: Type.STRING } },
            negatives: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "summary", "positives", "negatives", "suggestions"],
        },
      },
    });
    return response.text ? JSON.parse(response.text) : { score: 50, summary: "خطا", positives: [], negatives: [], suggestions: [] };
  } catch (error) { return { score: 50, summary: "خطا", positives: [], negatives: [], suggestions: [] }; }
};

export const analyzeBudget = async (incomes: IncomeRecord[], items: ShoppingItem[]): Promise<BudgetAnalysisResult> => {
  try {
    const incomeTotal = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    const expenseTotal = items.filter(i => i.status === 'BOUGHT').reduce((acc, curr) => acc + (curr.estimatedPrice * curr.quantity), 0);
    
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Monthly analysis. Income: ${incomeTotal}. Spent: ${expenseTotal}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictedMonthEnd: { type: Type.NUMBER },
            savingsSuggestion: { type: Type.STRING },
            unnecessaryExpenses: { type: Type.ARRAY, items: { type: Type.STRING } },
            financialHealthScore: { type: Type.NUMBER },
            advice: { type: Type.STRING },
          },
          required: ["predictedMonthEnd", "savingsSuggestion", "unnecessaryExpenses", "financialHealthScore", "advice"],
        },
      },
    });
    return response.text ? JSON.parse(response.text) : { predictedMonthEnd: 0, savingsSuggestion: "", unnecessaryExpenses: [], financialHealthScore: 0, advice: "خطا" };
  } catch (error) { return { predictedMonthEnd: 0, savingsSuggestion: "", unnecessaryExpenses: [], financialHealthScore: 0, advice: "خطا" }; }
};

export const generateWeeklyPlan = async (pantryNames: string[]): Promise<MealPlan[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `7-day meal plan from: ${pantryNames.join(", ")}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              day: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["LUNCH", "DINNER"] },
              foodName: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
              isCooked: { type: Type.BOOLEAN },
            },
            required: ["id", "day", "type", "foodName", "ingredients", "isCooked"],
          },
        },
      },
    });
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) { return []; }
};

export const generateHouseTasks = async (prompt: string): Promise<HouseTask[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `House tasks for: "${prompt}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              category: { type: Type.STRING, enum: ["CLEANING", "MAINTENANCE", "PLANTS", "CAR", "OTHER"] },
              frequency: { type: Type.STRING, enum: ["ONCE", "DAILY", "WEEKLY", "MONTHLY"] },
              nextDue: { type: Type.STRING },
              isDoneToday: { type: Type.BOOLEAN },
            },
            required: ["id", "title", "category", "frequency", "nextDue", "isDoneToday"],
          },
        },
      },
    });
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) { return []; }
};

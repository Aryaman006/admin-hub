 import { supabase } from '@/integrations/supabase/client';
 
 const CATEGORIES = [
   'Prostate Problems',
   'Osteoporosis',
   'Nose Allergy',
   'Neck Problems',
   'Menstrual Problems',
   'Menopause',
   'Liver Problems',
   'Knee Problems',
   'Insomnia',
   'Thyroid',
   'Migraine',
   'Fatigue',
   'Edema',
   'Obesity',
   'Memory Loss',
   'Breathing Problems',
   'Bone Problems',
   'Blood Pressure',
   'Bladder Problems',
   'Hair Loss',
   'Back Problems',
   'Asthma',
   'Arthritis',
   'Heart Problems',
   'Anxiety',
   'Low Hemoglobin',
   'Anti-aging',
   'Diabetes',
   'Stress Management',
   'Leg Pain',
   'Head Pain',
   'Eye Pain',
 ];
 
 export const seedCategories = async () => {
   // First, get existing categories to avoid duplicates
   const { data: existing } = await supabase
     .from('categories')
     .select('name');
 
   const existingNames = new Set((existing || []).map((c) => c.name));
 
   const newCategories = CATEGORIES
     .filter((name) => !existingNames.has(name))
     .map((name) => ({
       name,
       is_featured: false,
     }));
 
   if (newCategories.length === 0) {
     return { inserted: 0, message: 'All categories already exist' };
   }
 
   // @ts-expect-error - Schema mismatch with actual DB
   const { data, error } = await supabase.from('categories').insert(newCategories);
 
   if (error) {
     throw error;
   }
 
   return { inserted: newCategories.length, message: `Inserted ${newCategories.length} categories` };
 };
 
 export { CATEGORIES };
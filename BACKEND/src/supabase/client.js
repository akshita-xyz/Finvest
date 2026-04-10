const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createUser(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  
  if (error) throw error;
  return data;
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

async function saveUserProfile(userId, profile) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      ...profile,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

async function saveOnboardingData(userId, onboardingData) {
  const { data, error } = await supabase
    .from('onboarding_data')
    .upsert({
      user_id: userId,
      ...onboardingData,
      completed_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getOnboardingData(userId) {
  const { data, error } = await supabase
    .from('onboarding_data')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

async function savePortfolio(userId, portfolio) {
  const { data, error } = await supabase
    .from('portfolios')
    .upsert({
      user_id: userId,
      portfolio_data: portfolio,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getPortfolio(userId) {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

async function saveSimulationResult(userId, simulationData) {
  const { data, error } = await supabase
    .from('simulation_results')
    .insert({
      user_id: userId,
      ...simulationData
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getSimulationHistory(userId, limit = 10) {
  const { data, error } = await supabase
    .from('simulation_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

module.exports = {
  supabase,
  createUser,
  signIn,
  signOut,
  getCurrentUser,
  saveUserProfile,
  getUserProfile,
  saveOnboardingData,
  getOnboardingData,
  savePortfolio,
  getPortfolio,
  saveSimulationResult,
  getSimulationHistory
};

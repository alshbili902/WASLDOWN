const supabase = require('./src/services/supabase');

async function test() {
  const { data, error } = await supabase
    .from('users')
    .insert({
      telegram_id: 123456789,
      first_name: 'Test'
    })
    .select()
    .single();
    
  if (error) {
    console.error('Insert Error:', error);
  } else {
    console.log('Insert Success:', data);
  }
}

test();

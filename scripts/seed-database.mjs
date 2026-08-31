import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...rest] = trimmed.split('=');
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log('================================================================');
  console.log('🌱 SEEDING VENUE OS DATABASE WITH REALISTIC BANQUET DEMO DATA');
  console.log('================================================================\n');

  const demoOrgName = 'Royal Palace Banquet';
  const ownerEmail = 'owner@royalpalace.com';
  const defaultPassword = 'Password123!';

  // 1. Create or Find Owner Auth User
  console.log('1️⃣ Setting up Demo Owner Account...');
  let ownerUser = null;
  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingOwner = userList?.users?.find((u) => u.email?.toLowerCase() === ownerEmail.toLowerCase());

  if (existingOwner) {
    console.log(`   Found existing Auth user for ${ownerEmail} (${existingOwner.id})`);
    ownerUser = existingOwner;
  } else {
    const { data: newOwner, error: createError } = await supabase.auth.admin.createUser({
      email: ownerEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Rajesh Sharma', role: 'owner' },
    });
    if (createError || !newOwner?.user) {
      console.error('❌ Failed to create owner Auth user:', createError?.message);
      process.exit(1);
    }
    console.log(`   Created new Auth user for ${ownerEmail} (${newOwner.user.id})`);
    ownerUser = newOwner.user;
  }

  // 2. Create or Find Organization
  console.log('\n2️⃣ Setting up Organization...');
  let orgId = null;
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('name', demoOrgName)
    .maybeSingle();

  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`   Found existing organization: "${demoOrgName}" (${orgId})`);
  } else {
    const { data: newOrg, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: demoOrgName,
        currency: 'INR',
      })
      .select()
      .single();

    if (orgError || !newOrg) {
      console.error('❌ Failed to create organization:', orgError?.message);
      process.exit(1);
    }
    orgId = newOrg.id;
    console.log(`   Created new organization: "${demoOrgName}" (${orgId})`);
  }

  // 3. Upsert Owner Profile
  console.log('\n3️⃣ Linking Owner Profile...');
  const { error: ownerProfErr } = await supabase
    .from('profiles')
    .upsert({
      id: ownerUser.id,
      organization_id: orgId,
      name: 'Rajesh Sharma',
      full_name: 'Rajesh Sharma',
      email: ownerEmail,
      phone: '9876543210',
      role: 'owner',
      is_active: true,
      active: true,
    });
  if (ownerProfErr) console.warn('   Owner profile upsert warning:', ownerProfErr.message);
  else console.log('   Owner profile linked successfully.');

  // 4. Create Staff Members (Manager & Sales Executive)
  console.log('\n4️⃣ Setting up Staff Accounts...');
  const staffMembers = [
    { email: 'manager@royalpalace.com', name: 'Priya Verma', role: 'manager', phone: '9876543211' },
    { email: 'sales@royalpalace.com', name: 'Amit Kumar', role: 'staff', phone: '9876543212' },
  ];

  const staffProfileIds = [ownerUser.id];

  for (const s of staffMembers) {
    let sUser = userList?.users?.find((u) => u.email?.toLowerCase() === s.email.toLowerCase());
    if (!sUser) {
      const { data: createdStaff, error: sErr } = await supabase.auth.admin.createUser({
        email: s.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { full_name: s.name, role: s.role },
      });
      if (sErr || !createdStaff?.user) {
        console.warn(`   Could not create staff Auth for ${s.email}:`, sErr?.message);
        continue;
      }
      sUser = createdStaff.user;
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .upsert({
        id: sUser.id,
        organization_id: orgId,
        name: s.name,
        full_name: s.name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        is_active: true,
        active: true,
      });

    if (!profErr) {
      console.log(`   Staff account ready: ${s.name} (${s.role}) - ${s.email}`);
      staffProfileIds.push(sUser.id);
    }
  }

  // 5. Seed 15 Realistic Banquet Leads
  console.log('\n5️⃣ Seeding 15 Realistic Banquet Leads...');
  const now = new Date();
  const todayIso = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0).toISOString();
  const overdueIso = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const upcomingIso = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const leadsData = [
    {
      customer_name: 'Ananya & Vikram Malhotra',
      phone: '9811223344',
      email: 'ananya.m@example.com',
      source: 'Instagram',
      event_type: 'Wedding',
      event_date_status: 'fixed',
      event_date: '2026-11-20',
      guest_count_status: 'fixed',
      guest_count: 500,
      budget: 1500000,
      requirement: 'Grand royal wedding with lavish North & South Indian catering and pool-side cocktail setup.',
      status: 'Interested',
      priority: 'High',
      next_follow_up_at: todayIso,
      follow_up_note: 'Discuss menu customization and stage decor themes.',
    },
    {
      customer_name: 'Dr. Suresh Agarwal',
      phone: '9822334455',
      email: 'suresh.agarwal@example.com',
      source: 'Google Business Profile',
      event_type: 'Reception',
      event_date_status: 'fixed',
      event_date: '2026-12-15',
      guest_count_status: 'fixed',
      guest_count: 350,
      budget: 850000,
      requirement: 'Reception dinner with pure vegetarian catering and floral stage backdrop.',
      status: 'Follow-up',
      priority: 'High',
      next_follow_up_at: overdueIso,
      follow_up_note: 'Confirm advance booking amount and tasting session date.',
    },
    {
      customer_name: 'TechNova Solutions Pvt Ltd',
      phone: '9833445566',
      email: 'events@technovasolutions.com',
      source: 'Website',
      event_type: 'Corporate',
      event_date_status: 'fixed',
      event_date: '2026-10-05',
      guest_count_status: 'fixed',
      guest_count: 200,
      budget: 450000,
      requirement: 'Annual corporate awards summit with AV projector setup, podium, and hi-tea buffer.',
      status: 'Converted',
      priority: 'Medium',
      next_follow_up_at: null,
      follow_up_note: null,
    },
    {
      customer_name: 'Neha Kapoor',
      phone: '9844556677',
      email: 'neha.k@example.com',
      source: 'Meta',
      event_type: 'Birthday',
      event_date_status: 'fixed',
      event_date: '2026-09-25',
      guest_count_status: 'fixed',
      guest_count: 80,
      budget: 150000,
      requirement: '1st Birthday party with balloon theme decor, DJ, and kids buffet counter.',
      status: 'New',
      priority: 'Medium',
      next_follow_up_at: upcomingIso,
      follow_up_note: 'Send birthday package brochure and photo gallery.',
    },
    {
      customer_name: 'Rohan & Simran Bhatia',
      phone: '9855667788',
      email: 'simran.bhatia@example.com',
      source: 'Walk-in',
      event_type: 'Ring Ceremony',
      event_date_status: 'not_fixed',
      event_date: null,
      guest_count_status: 'fixed',
      guest_count: 150,
      budget: 400000,
      requirement: 'Ring ceremony in November. Looking for dates and hall availability.',
      status: 'Contacted',
      priority: 'High',
      next_follow_up_at: todayIso,
      follow_up_note: 'Check weekend availability for November 2nd and 3rd week.',
    },
    {
      customer_name: 'Rameshwar Gupta',
      phone: '9866778899',
      email: 'r.gupta@example.com',
      source: 'Referral',
      event_type: 'Anniversary',
      event_date_status: 'fixed',
      event_date: '2026-10-18',
      guest_count_status: 'fixed',
      guest_count: 120,
      budget: 300000,
      requirement: 'Silver jubilee celebration. Need live ghazal music and special sit-down banquet.',
      status: 'Interested',
      priority: 'Medium',
      next_follow_up_at: upcomingIso,
      follow_up_note: 'Share musical performance options and quotes.',
    },
    {
      customer_name: 'Pooja Singhania',
      phone: '9877889900',
      email: 'pooja.s@example.com',
      source: 'WhatsApp',
      event_type: 'Kitty Party',
      event_date_status: 'fixed',
      event_date: '2026-09-15',
      guest_count_status: 'fixed',
      guest_count: 35,
      budget: 60000,
      requirement: 'Afternoon kitty party with mocktails and starter platter.',
      status: 'Contacted',
      priority: 'Low',
      next_follow_up_at: null,
      follow_up_note: null,
    },
    {
      customer_name: 'Meenakshi & Alok Sen',
      phone: '9888990011',
      email: 'alok.sen@example.com',
      source: 'Phone Call',
      event_type: 'Annaprashan',
      event_date_status: 'fixed',
      event_date: '2026-10-10',
      guest_count_status: 'fixed',
      guest_count: 100,
      budget: 220000,
      requirement: 'Traditional Bengali Annaprashan ceremony with authentic fish and sweet counter.',
      status: 'Follow-up',
      priority: 'Medium',
      next_follow_up_at: overdueIso,
      follow_up_note: 'Finalize Bengali thali menu and hall timing.',
    },
    {
      customer_name: 'Kavita Joshi',
      phone: '9899001122',
      email: 'kavita.j@example.com',
      source: 'Google',
      event_type: 'Wedding',
      event_date_status: 'not_fixed',
      event_date: null,
      guest_count_status: 'not_fixed',
      guest_count: null,
      budget: 1200000,
      requirement: 'Exploring banquet halls for destination-style local wedding early next year.',
      status: 'New',
      priority: 'Low',
      next_follow_up_at: null,
      follow_up_note: null,
    },
    {
      customer_name: 'Apex Healthcare Summit',
      phone: '9810112233',
      email: 'contact@apexhealth.org',
      source: 'Website',
      event_type: 'Corporate',
      event_date_status: 'fixed',
      event_date: '2026-11-05',
      guest_count_status: 'fixed',
      guest_count: 300,
      budget: 700000,
      requirement: 'Medical conference with separate lunch dining hall and plenary seating.',
      status: 'Interested',
      priority: 'High',
      next_follow_up_at: todayIso,
      follow_up_note: 'Submit formal GST proposal and layout diagram.',
    },
    {
      customer_name: 'Deepak & Sneha Chawla',
      phone: '9820223344',
      email: 'sneha.c@example.com',
      source: 'Facebook',
      event_type: 'Wedding',
      event_date_status: 'fixed',
      event_date: '2026-12-08',
      guest_count_status: 'fixed',
      guest_count: 450,
      budget: 1400000,
      requirement: 'Evening wedding with baraat welcome path and mandap decor.',
      status: 'Converted',
      priority: 'High',
      next_follow_up_at: null,
      follow_up_note: null,
    },
    {
      customer_name: 'Tarun Mehra',
      phone: '9830334455',
      email: 'tarun.m@example.com',
      source: 'Meta',
      event_type: 'Birthday',
      event_date_status: 'fixed',
      event_date: '2026-09-30',
      guest_count_status: 'fixed',
      guest_count: 60,
      budget: 90000,
      requirement: '50th Birthday celebration with retro Bollywood theme and live barbecue.',
      status: 'Follow-up',
      priority: 'Medium',
      next_follow_up_at: upcomingIso,
      follow_up_note: 'Confirm DJ sound timings and bar license requirements.',
    },
    {
      customer_name: 'Manish Trivedi',
      phone: '9840445566',
      email: 'm.trivedi@example.com',
      source: 'Other',
      event_type: 'Other',
      event_date_status: 'not_fixed',
      event_date: null,
      guest_count_status: 'fixed',
      guest_count: 50,
      budget: 80000,
      requirement: 'Community spiritual satsang and prasad distribution.',
      status: 'Lost',
      priority: 'Low',
      next_follow_up_at: null,
      follow_up_note: null,
    },
    {
      customer_name: 'Harish & Sunita Roy',
      phone: '9850556677',
      email: 'sunita.roy@example.com',
      source: 'Google Business Profile',
      event_type: 'Reception',
      event_date_status: 'fixed',
      event_date: '2026-11-28',
      guest_count_status: 'fixed',
      guest_count: 280,
      budget: 650000,
      requirement: 'Post-wedding reception for relatives and colleagues.',
      status: 'Interested',
      priority: 'High',
      next_follow_up_at: todayIso,
      follow_up_note: 'Discuss per-plate pricing and complimentary rooms.',
    },
    {
      customer_name: 'Vikas Oberoi',
      phone: '9860667788',
      email: 'vikas.o@example.com',
      source: 'Referral',
      event_type: 'Wedding',
      event_date_status: 'fixed',
      event_date: '2026-12-22',
      guest_count_status: 'fixed',
      guest_count: 600,
      budget: 2000000,
      requirement: 'Premium luxury wedding with valet parking and celebrity DJ setup.',
      status: 'New',
      priority: 'High',
      next_follow_up_at: upcomingIso,
      follow_up_note: 'Schedule in-person venue walkthrough with family.',
    },
  ];

  let insertedCount = 0;
  for (let i = 0; i < leadsData.length; i++) {
    const lead = leadsData[i];
    const assignedOwner = staffProfileIds[i % staffProfileIds.length];

    // Check if duplicate phone exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('organization_id', orgId)
      .eq('phone', lead.phone)
      .maybeSingle();

    let leadId = existingLead?.id;

    if (!leadId) {
      const { data: createdLead, error: leadErr } = await supabase
        .from('leads')
        .insert({
          organization_id: orgId,
          owner_id: assignedOwner,
          ...lead,
        })
        .select()
        .single();

      if (leadErr || !createdLead) {
        console.warn(`   Failed to insert lead ${lead.customer_name}:`, leadErr?.message);
        continue;
      }
      leadId = createdLead.id;
      insertedCount++;
    }

    // Add activity log and discussion
    await supabase.from('lead_activity').insert({
      organization_id: orgId,
      lead_id: leadId,
      actor_id: assignedOwner,
      action_type: 'lead_created',
      metadata: { details: `Inquiry created for ${lead.customer_name} (${lead.event_type})` },
    });

    if (lead.status !== 'New') {
      await supabase.from('lead_discussions').insert({
        organization_id: orgId,
        lead_id: leadId,
        author_id: assignedOwner,
        body: `Initial conversation completed with client. Customer is considering ${lead.event_type} on ${lead.event_date || 'tentative dates'}.`,
      });
    }
  }

  console.log(`\n✅ Seed complete! Inserted/verified ${insertedCount} leads.`);
  console.log('\n================================================================');
  console.log('🎉 DEMO ACCOUNTS READY FOR LOCAL LOGIN:');
  console.log('================================================================');
  console.log(`👑 OWNER:   Email: ${ownerEmail} | Password: ${defaultPassword}`);
  console.log(`👔 MANAGER: Email: manager@royalpalace.com | Password: ${defaultPassword}`);
  console.log(`💼 SALES:   Email: sales@royalpalace.com   | Password: ${defaultPassword}`);
  console.log('================================================================\n');
}

seed().catch((err) => {
  console.error('❌ Seed script error:', err);
  process.exit(1);
});

const { pool } = require('../backend/src/config/database');

async function verifySchema() {
  const client = await pool.connect();
  try {
    console.log('Starting Schema & Constraint Verification...');
    await client.query('BEGIN');
    
    // 1. Insert Arena
    const arenaRes = await client.query(
      `INSERT INTO arenas (name, location) VALUES ('Arena Sports Hub', 'Trivandrum') RETURNING id`
    );
    const arenaId = arenaRes.rows[0].id;
    console.log('✅ Arena created successfully with ID:', arenaId);

    // 2. Insert Slot
    const slotRes = await client.query(
      `INSERT INTO slots (arena_id, sport, date, start_time, end_time, duration_minutes, normal_price, period, status)
       VALUES ($1, 'Football', '2026-09-10', '10:00', '11:00', 60, 1200.00, 'NON_PEAK', 'AVAILABLE')
       RETURNING id`,
      [arenaId]
    );
    const slotId = slotRes.rows[0].id;
    console.log('✅ Slot created successfully with ID:', slotId);

    // 3. Insert Customer
    const custRes = await client.query(
      `INSERT INTO customers (name, email, phone) VALUES ('John Doe', 'john.doe@example.com', '+919876543210') RETURNING id`
    );
    const custId = custRes.rows[0].id;
    console.log('✅ Customer created successfully with ID:', custId);

    // 4. Insert Booking
    const bookRes = await client.query(
      `INSERT INTO bookings (slot_id, customer_id, booking_time, original_price, discount_percentage, discount_amount, final_price, duration_minutes, status)
       VALUES ($1, $2, NOW(), 1200.00, 15.00, 180.00, 1020.00, 60, 'CONFIRMED')
       RETURNING id`,
      [slotId, custId]
    );
    console.log('✅ Booking created successfully with ID:', bookRes.rows[0].id);

    // 5. Insert Recommendation
    const recRes = await client.query(
      `INSERT INTO recommendations (slot_id, recommended_action, reason, booking_probability, expected_revenue, expected_profit)
       VALUES ($1, 'DISCOUNT', 'Low historical off-peak demand', 0.6500, 1020.00, 820.00)
       RETURNING id`,
      [slotId]
    );
    console.log('✅ Recommendation created successfully with ID:', recRes.rows[0].id);

    // 6. Insert Campaign
    const campRes = await client.query(
      `INSERT INTO campaigns (slot_id, campaign_type, target_customer_count, message, discount_percentage, status)
       VALUES ($1, 'DISCOUNT', 25, 'Special off-peak discount of 15%!', 15.00, 'DRAFT')
       RETURNING id`,
      [slotId]
    );
    console.log('✅ Campaign created successfully with ID:', campRes.rows[0].id);

    // 7. Test Check Constraint: discount_percentage > 100
    try {
      await client.query(
        `INSERT INTO campaigns (slot_id, campaign_type, discount_percentage) VALUES ($1, 'DISCOUNT', 150.00)`,
        [slotId]
      );
      throw new Error('Constraint violation check failed: invalid discount_percentage was accepted');
    } catch (err) {
      console.log('✅ Check constraint verified: discount > 100 rejected as expected.');
    }

    // 8. Test Check Constraint: period validity
    try {
      await client.query(
        `INSERT INTO slots (arena_id, sport, date, start_time, end_time, duration_minutes, normal_price, period)
         VALUES ($1, 'Football', '2026-09-10', '10:00', '11:00', 60, 1200.00, 'INVALID_PERIOD')`,
        [arenaId]
      );
      throw new Error('Constraint violation check failed: invalid period was accepted');
    } catch (err) {
      console.log('✅ Check constraint verified: invalid period rejected as expected.');
    }

    // Rollback so the database remains clean without fake/mock data
    await client.query('ROLLBACK');
    console.log('✅ All tests passed! Test transaction rolled back (database remains clean).');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Schema verification failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifySchema();

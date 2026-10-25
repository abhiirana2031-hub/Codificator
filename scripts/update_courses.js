import { runQuery, queryOne } from '../server/db/db.js';

console.log('Synchronizing course records and prices in database...');

// 1. Update Fullstack course (Course B: ₹249)
runQuery(`
  UPDATE courses SET 
    title = 'Full Stack Web Development',
    price = 249, 
    original_price = 499,
    level = 'Intermediate',
    category = 'Full-Stack & APIs',
    thumbnail = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
    description = 'Production-ready curriculum covering HTML5, CSS Grid, JavaScript ESNext, React 19, Node.js, Express, PostgreSQL, and verifiable certification.',
    is_published = 1 
  WHERE id = 'course-fullstack-web'
`);

// 3. Insert or update course-dsa-java (Course A: ₹199)
const dsa = queryOne('SELECT id FROM courses WHERE id = ?', ['course-dsa-java']);
if (!dsa) {
  runQuery(`
    INSERT INTO courses (
      id, title, slug, description, thumbnail, category, level, instructor_id, 
      estimated_duration, price, original_price, is_published
    ) VALUES (
      'course-dsa-java', 
      'Data Structures & Algorithms in Java & C++', 
      'dsa-java', 
      'Master Arrays, Trees, Dynamic Programming, Graphs, and problem-solving patterns for product company technical interviews.', 
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800', 
      'DSA & Placements', 
      'Beginner to Advanced', 
      'usr-instructor-1', 
      '50 hours', 
      199, 
      399, 
      1
    )
  `);
} else {
  runQuery(`
    UPDATE courses SET 
      title = 'Data Structures & Algorithms in Java & C++',
      price = 199, 
      original_price = 399, 
      level = 'Beginner to Advanced',
      category = 'DSA & Placements',
      thumbnail = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
      is_published = 1 
    WHERE id = 'course-dsa-java'
  `);
}

// 4. Insert or update course-system-design (Course C: ₹349)
const sd = queryOne('SELECT id FROM courses WHERE id = ?', ['course-system-design']);
if (!sd) {
  runQuery(`
    INSERT INTO courses (
      id, title, slug, description, thumbnail, category, level, instructor_id, 
      estimated_duration, price, original_price, is_published
    ) VALUES (
      'course-system-design', 
      'System Design & Distributed Architectures', 
      'system-design', 
      'High-level and low-level system design: microservices, caching, message queues, database sharding, CAP theorem, and scalability.', 
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800', 
      'System Design', 
      'Advanced', 
      'usr-admin-1', 
      '40 hours', 
      349, 
      699, 
      1
    )
  `);
} else {
  runQuery(`
    UPDATE courses SET 
      title = 'System Design & Distributed Architectures',
      price = 349, 
      original_price = 699, 
      level = 'Advanced',
      category = 'System Design',
      thumbnail = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800',
      is_published = 1 
    WHERE id = 'course-system-design'
  `);
}

console.log('✅ Database courses and pricing synchronized successfully:');
console.log('- Full Stack Web Development: ₹249 (was ₹499)');
console.log('- Data Structures & Algorithms in Java & C++: ₹199 (was ₹399)');
console.log('- System Design & Distributed Architectures: ₹349 (was ₹699)');

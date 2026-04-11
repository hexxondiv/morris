import { Clerk } from '@clerk/clerk-sdk-node';
import fs from 'fs';
import csv from 'csv-parser';

// Initialize Clerk with your PRODUCTION secret key
const clerk = Clerk({ 
  secretKey: process.env.CLERK_SECRET_KEY // Your production secret key
});

export async function migrateUsersFromCSV(csvFilePath) {
  const users = [];
  const userMapping = []; // Store old_id -> new_id mapping
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        // Parse the verified_email_addresses if it's a JSON string
        let verifiedEmails;
        try {
          verifiedEmails = JSON.parse(row.verified_email_addresses || '[]');
        } catch {
          verifiedEmails = [row.primary_email_address];
        }

        users.push({
          oldId: row.id, // Store the original ID from dev
          firstName: row.first_name || '',
          lastName: row.last_name || '',
          emailAddress: [row.primary_email_address],
          passwordDigest: row.password_digest,
          passwordHasher: row.password_hasher,
          skipPasswordChecks: true,
          skipPasswordRequirement: true,
        });
      })
      .on('end', async () => {
        console.log(`Found ${users.length} users to migrate`);
        
        let successful = 0;
        let failed = 0;
        
        // Process users in batches to avoid rate limits
        for (let i = 0; i < users.length; i++) {
          const user = users[i];
          
          try {
            const createdUser = await clerk.users.createUser(user);
            
            // Store the mapping
            userMapping.push({
              old_id: user.oldId,
              new_id: createdUser.id,
              email: user.emailAddress[0]
            });
            
            console.log(`✅ Migrated: ${user.emailAddress[0]} (${user.oldId} → ${createdUser.id})`);
            successful++;
            
            // Small delay to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`❌ Failed: ${user.emailAddress[0]} - ${error.message}`);
            failed++;
          }
          
          // Progress update every 10 users
          if ((i + 1) % 10 === 0) {
            console.log(`Progress: ${i + 1}/${users.length} processed`);
          }
        }
        
        // Save mapping to file for database update
        fs.writeFileSync('./user_id_mapping.json', JSON.stringify(userMapping, null, 2));
        console.log(`\nUser ID mapping saved to user_id_mapping.json`);
        
        console.log(`\nMigration complete!`);
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Failed: ${failed}`);
        
        resolve({ successful, failed, userMapping });
      })
      .on('error', reject);
  });
}

// Usage
async function main() {
  try {
    await migrateUsersFromCSV('./users.csv'); // Update path to your CSV
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Uncomment to run
// main();
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testModalViews() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  const screenshotsDir = path.join(__dirname, 'modal-test-screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  try {
    console.log('1. Navigating to connections page...');
    await page.goto('http://localhost:3005/connections');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotsDir, '01-connections-page.png'), fullPage: true });

    console.log('2. Looking for ENG Local connection menu...');
    // Click the menu button on the ENG Local connection
    const engLocalCard = page.locator('text=ENG Local').locator('..');
    const menuButton = engLocalCard.locator('button').last(); // The three-dot menu is likely the last button
    
    await menuButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '02-menu-opened.png') });

    console.log('3. Clicking Edit...');
    await page.click('text=Edit');
    await page.waitForTimeout(1000);
    
    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotsDir, '03-connection-settings-modal.png'), fullPage: true });
    
    // Check modal dimensions for overflow
    const modal = page.locator('[role="dialog"]');
    const modalBox = await modal.boundingBox();
    const viewport = page.viewportSize();
    
    console.log('\n=== CONNECTION SETTINGS VIEW ===');
    console.log(`Modal dimensions: ${modalBox.width}x${modalBox.height}`);
    console.log(`Viewport dimensions: ${viewport.width}x${viewport.height}`);
    console.log(`Overflows viewport: ${modalBox.height > viewport.height || modalBox.width > viewport.width}`);

    console.log('4. Looking for accounts table in sidebar...');
    // Wait for sidebar content to load
    await page.waitForTimeout(2000);
    
    // Look for table items in the sidebar
    const sidebarTables = await page.$$('text=accounts, [data-testid*="accounts"], .table-item:has-text("accounts")');
    
    if (sidebarTables.length > 0) {
      console.log('5. Clicking on accounts table...');
      await sidebarTables[0].click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '04-accounts-general-tab.png'), fullPage: true });
      
      console.log('\n=== ACCOUNTS GENERAL TAB ===');
      const modalBox2 = await modal.boundingBox();
      console.log(`Modal dimensions: ${modalBox2.width}x${modalBox2.height}`);
      console.log(`Overflows viewport: ${modalBox2.height > viewport.height || modalBox2.width > viewport.width}`);

      // Test view editors
      const viewTypes = ['Inline View', 'Card View', 'List View'];
      
      for (let i = 0; i < viewTypes.length; i++) {
        const viewType = viewTypes[i];
        console.log(`6.${i + 1}. Testing ${viewType} editor...`);
        
        try {
          // Look for the Edit button next to this view type
          const viewSection = page.locator(`text=${viewType}`).locator('..');
          const editButton = viewSection.locator('button:has-text("Edit")');
          
          if (await editButton.isVisible()) {
            await editButton.click();
            await page.waitForTimeout(1500);
            
            const screenshotName = `05-${i + 1}-${viewType.toLowerCase().replace(/\s+/g, '-')}-editor.png`;
            await page.screenshot({ path: path.join(screenshotsDir, screenshotName), fullPage: true });
            
            // Check for overflow in this view
            const modalBox3 = await modal.boundingBox();
            console.log(`\n=== ${viewType.toUpperCase()} EDITOR ===`);
            console.log(`Modal dimensions: ${modalBox3.width}x${modalBox3.height}`);
            console.log(`Overflows viewport: ${modalBox3.height > viewport.height || modalBox3.width > viewport.width}`);
            
            // Check if content is scrollable
            const modalContent = modal.locator('[class*="overflow"], [style*="overflow"], .scrollable');
            const hasScrollableContent = await modalContent.count() > 0;
            console.log(`Has scrollable content indicators: ${hasScrollableContent}`);
            
            // Navigate back to General tab
            const generalTab = page.locator('text=General');
            if (await generalTab.isVisible()) {
              await generalTab.click();
              await page.waitForTimeout(500);
            }
          } else {
            console.log(`No Edit button found for ${viewType}`);
          }
        } catch (e) {
          console.log(`Error testing ${viewType}: ${e.message}`);
        }
      }
      
      // Test other tables
      console.log('7. Testing other tables...');
      const allTables = await page.$$('[data-testid*="table"], .table-item, .sidebar-item');
      console.log(`Found ${allTables.length} potential table elements`);
      
      // Try to click on a few different tables
      for (let i = 1; i < Math.min(allTables.length, 4); i++) {
        try {
          await allTables[i].click();
          await page.waitForTimeout(1000);
          
          const tableName = await allTables[i].textContent();
          console.log(`Testing table: ${tableName}`);
          
          await page.screenshot({ 
            path: path.join(screenshotsDir, `06-${i}-table-${tableName?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}.png`), 
            fullPage: true 
          });
          
          // Test Card View specifically for this table (as it was mentioned as problematic)
          const cardViewSection = page.locator('text=Card View').locator('..');
          const cardEditButton = cardViewSection.locator('button:has-text("Edit")');
          
          if (await cardEditButton.isVisible()) {
            await cardEditButton.click();
            await page.waitForTimeout(1500);
            
            await page.screenshot({ 
              path: path.join(screenshotsDir, `07-${i}-${tableName?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}-card-view.png`), 
              fullPage: true 
            });
            
            const modalBox4 = await modal.boundingBox();
            console.log(`\n=== ${tableName?.toUpperCase() || 'UNKNOWN'} TABLE CARD VIEW ===`);
            console.log(`Modal dimensions: ${modalBox4.width}x${modalBox4.height}`);
            console.log(`Overflows viewport: ${modalBox4.height > viewport.height || modalBox4.width > viewport.width}`);
            
            // Go back to General
            const generalTab = page.locator('text=General');
            if (await generalTab.isVisible()) {
              await generalTab.click();
              await page.waitForTimeout(500);
            }
          }
        } catch (e) {
          console.log(`Error testing table ${i}: ${e.message}`);
        }
      }
    } else {
      console.log('No accounts table found in sidebar');
    }
    
    console.log(`\nAll screenshots saved to: ${screenshotsDir}`);
    
  } catch (error) {
    console.error('Error during testing:', error);
    await page.screenshot({ path: path.join(screenshotsDir, 'error.png') });
  }
  
  console.log('\nKeeping browser open for 5 seconds for manual inspection...');
  await page.waitForTimeout(5000);
  
  await browser.close();
}

testModalViews().catch(console.error);
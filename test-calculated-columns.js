import puppeteer from 'puppeteer';

async function testCalculatedColumns() {
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('🚀 Navigating to accounts table...');
    await page.goto('http://localhost:3005/connections/ENG%20Local?table=accounts', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    console.log('📊 Checking for calculated columns in current view...');
    
    // Look for calculated columns in the data view
    const calculatedColumns = await page.evaluate(() => {
      // Look for column headers that might be calculated columns
      const headers = Array.from(document.querySelectorAll('th, [role="columnheader"]'));
      const calculatedHeaders = headers.filter(header => {
        const text = header.textContent || '';
        // Look for headers that might indicate calculated columns
        return text.includes('calculated') || text.includes('template') || text.includes('computed');
      });
      
      // Also look for any data cells that might contain calculated values
      const cells = Array.from(document.querySelectorAll('td, [role="gridcell"]'));
      const potentialCalculatedCells = cells.filter(cell => {
        const text = cell.textContent || '';
        // Look for patterns like "1 John 2 Doe" or template-like content
        return /^\d+\s+\w+\s+\d+\s+\w+/.test(text) || text.includes('{') || text.includes('}');
      });
      
      return {
        headers: calculatedHeaders.map(h => h.textContent),
        cells: potentialCalculatedCells.map(c => c.textContent).slice(0, 10) // First 10 examples
      };
    });
    
    console.log('📋 Found calculated column headers:', calculatedColumns.headers);
    console.log('📋 Found potential calculated cells:', calculatedColumns.cells);
    
    // Check different view modes
    console.log('🔄 Testing different view modes...');
    
    // Look for view mode buttons
    const viewModeButtons = await page.$$('[role="button"], button');
    
    for (let button of viewModeButtons) {
      const buttonText = await button.evaluate(el => el.textContent || el.getAttribute('aria-label') || '');
      if (buttonText.toLowerCase().includes('grid') || 
          buttonText.toLowerCase().includes('card') || 
          buttonText.toLowerCase().includes('list') || 
          buttonText.toLowerCase().includes('table')) {
        console.log(`🔘 Clicking view mode: ${buttonText}`);
        await button.click();
        await page.waitForTimeout(2000);
        
        // Check calculated columns in this view
        const viewCalculatedColumns = await page.evaluate(() => {
          const cells = Array.from(document.querySelectorAll('td, [role="gridcell"], .card, .list-item'));
          return cells.filter(cell => {
            const text = cell.textContent || '';
            return /^\d+\s+\w+\s+\d+\s+\w+/.test(text) || text.includes('{') || text.includes('}');
          }).map(c => c.textContent).slice(0, 5);
        });
        
        console.log(`📊 Calculated columns in ${buttonText} view:`, viewCalculatedColumns);
      }
    }
    
    console.log('⚙️ Testing configuration modal...');
    
    // Look for table icon or settings button to open configuration modal
    const tableIcon = await page.$('[data-testid="table-icon"], .table-icon, [title*="settings"], [aria-label*="settings"]');
    
    if (tableIcon) {
      console.log('🎯 Found table icon/settings button, clicking...');
      await tableIcon.click();
      await page.waitForTimeout(2000);
      
      // Look for accounts table in the modal
      const accountsTableButton = await page.$('text=accounts, [title*="accounts"], [aria-label*="accounts"]');
      
      if (accountsTableButton) {
        console.log('📋 Found accounts table in modal, clicking...');
        await accountsTableButton.click();
        await page.waitForTimeout(2000);
        
        // Look for Calculated Columns section
        const calculatedColumnsSection = await page.evaluate(() => {
          const text = document.body.textContent || '';
          return text.includes('Calculated Columns') || text.includes('calculated columns');
        });
        
        console.log('📊 Calculated Columns section found:', calculatedColumnsSection);
        
        if (calculatedColumnsSection) {
          // Look for existing calculated columns
          const existingCalculatedColumns = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('*'));
            const calculatedElements = elements.filter(el => {
              const text = el.textContent || '';
              return text.includes('{firstName}') || text.includes('{lastName}') || 
                     /\d+\s*\{.*?\}\s*\d+\s*\{.*?\}/.test(text);
            });
            return calculatedElements.map(el => el.textContent);
          });
          
          console.log('📋 Existing calculated columns:', existingCalculatedColumns);
          
          if (existingCalculatedColumns.length === 0) {
            console.log('➕ No calculated columns found, attempting to create a test one...');
            
            // Look for add button or create button
            const addButton = await page.$('[data-testid="add-calculated-column"], button:has-text("Add"), button:has-text("Create"), button:has-text("+")');
            
            if (addButton) {
              console.log('🔘 Found add button, clicking...');
              await addButton.click();
              await page.waitForTimeout(1000);
              
              // Look for template input field
              const templateInput = await page.$('input[placeholder*="template"], input[name*="template"], textarea[placeholder*="template"]');
              
              if (templateInput) {
                console.log('📝 Found template input, entering test template...');
                await templateInput.type('1 {firstName} 2 {lastName}');
                await page.waitForTimeout(500);
                
                // Look for save button
                const saveButton = await page.$('button:has-text("Save"), button:has-text("Create"), [data-testid="save-button"]');
                
                if (saveButton) {
                  console.log('💾 Found save button, clicking...');
                  await saveButton.click();
                  await page.waitForTimeout(2000);
                  
                  console.log('✅ Test calculated column created successfully');
                } else {
                  console.log('❌ Could not find save button');
                }
              } else {
                console.log('❌ Could not find template input field');
              }
            } else {
              console.log('❌ Could not find add button for calculated columns');
            }
          }
        } else {
          console.log('❌ Calculated Columns section not found in modal');
        }
      } else {
        console.log('❌ Could not find accounts table in modal');
      }
    } else {
      console.log('❌ Could not find table icon/settings button');
    }
    
    // Final check for calculated columns after potential creation
    console.log('🔍 Final check for calculated columns...');
    
    await page.goto('http://localhost:3005/connections/ENG%20Local?table=accounts', { 
      waitUntil: 'networkidle0' 
    });
    await page.waitForTimeout(3000);
    
    const finalCalculatedColumns = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('td, [role="gridcell"], .card, .list-item'));
      const calculatedCells = cells.filter(cell => {
        const text = cell.textContent || '';
        // Look for the specific pattern we created: "1 [name] 2 [name]"
        return /^\d+\s+\w+\s+\d+\s+\w+/.test(text);
      });
      
      return {
        count: calculatedCells.length,
        examples: calculatedCells.map(c => c.textContent).slice(0, 5)
      };
    });
    
    console.log('📊 Final calculated columns found:', finalCalculatedColumns);
    
    // Check for any JavaScript errors
    const errors = await page.evaluate(() => {
      return window.console ? window.console._errors || [] : [];
    });
    
    if (errors.length > 0) {
      console.log('❌ JavaScript errors found:', errors);
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    console.log('🏁 Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testCalculatedColumns().catch(console.error);
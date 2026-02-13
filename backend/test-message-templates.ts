import { MessageTemplateService } from './src/services/MessageTemplateService';

async function testMessageTemplates() {
  try {
    console.log('Testing MessageTemplateService...');
    const service = new MessageTemplateService();
    
    const templates = await service.getTemplates('物件');
    console.log('Templates found:', templates.length);
    console.log('Templates:', JSON.stringify(templates, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testMessageTemplates();

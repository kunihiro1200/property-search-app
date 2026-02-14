import { BuyerService } from './src/services/BuyerService';

async function checkNextBuyerNumber() {
  const buyerService = new BuyerService();
  
  console.log('次の買主番号を取得します...');
  const nextBuyerNumber = await buyerService.generateBuyerNumber();
  console.log('次の買主番号:', nextBuyerNumber);
}

checkNextBuyerNumber();

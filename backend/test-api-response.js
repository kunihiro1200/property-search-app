// AA13424のAPIレスポンスを確認
fetch('http://localhost:3000/api/sellers/dab10d67-54fd-4b04-9f6b-9596bd04e2fc', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
})
.then(r => r.json())
.then(data => {
  console.log('訪問取得日:', data.visitAcquisitionDate);
  console.log('訪問日:', data.visitDate);
  console.log('営担:', data.visitAssignee);
  console.log('訪問査定取得者:', data.visitValuationAcquirer);
});

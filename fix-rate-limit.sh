#!/bin/bash

# Rate limit sorununu çözmek için workflow güncelleme script'i
# Seçenek 1: Model'i gpt-4o-mini'ye değiştir (önerilen)
# Seçenek 2: Error handling ekle

WORKFLOW_FILE="n8n-workflows/multi-agent-consensus-structured-parser.json"

echo "🔧 Fixing Rate Limit Issue"
echo "=========================="
echo ""

if [ ! -f "$WORKFLOW_FILE" ]; then
  echo "❌ Workflow file not found: $WORKFLOW_FILE"
  exit 1
fi

echo "📋 Current models in workflow:"
grep -A 2 '"model":' "$WORKFLOW_FILE" | grep '"model":' | head -4

echo ""
echo "Seçenekler:"
echo "1. Model'i gpt-4o-mini'ye değiştir (Önerilen - Hızlı çözüm)"
echo "2. Model'i gpt-4o'da bırak (Error handling ekle)"
echo ""
read -p "Seçiminiz (1 veya 2): " choice

case $choice in
  1)
    echo ""
    echo "🔄 Changing all models to gpt-4o-mini..."
    
    # Backup oluştur
    cp "$WORKFLOW_FILE" "${WORKFLOW_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    
    # gpt-4o → gpt-4o-mini değiştir
    sed -i '' 's/"model": "gpt-4o"/"model": "gpt-4o-mini"/g' "$WORKFLOW_FILE"
    
    echo "✅ All models changed to gpt-4o-mini"
    echo ""
    echo "📋 Updated models:"
    grep -A 2 '"model":' "$WORKFLOW_FILE" | grep '"model":' | head -4
    ;;
    
  2)
    echo ""
    echo "⚠️  Model gpt-4o'da kalacak"
    echo "   Rate limit sorunu için manuel error handling eklemeniz gerekecek"
    echo ""
    echo "Önerilen çözümler:"
    echo "  - Request'ler arasında delay ekleyin"
    echo "  - Sequential execution kullanın"
    echo "  - OpenAI API limit'inizi artırın"
    ;;
    
  *)
    echo "❌ Geçersiz seçim"
    exit 1
    ;;
esac

echo ""
echo "✅ Done!"
echo ""
echo "📝 Next steps:"
echo "  1. Workflow'u n8n'e import edin"
echo "  2. Test edin: ./test-multi-agent-consensus.sh"
echo ""


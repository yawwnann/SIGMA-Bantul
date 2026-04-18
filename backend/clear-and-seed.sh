#!/bin/bash

echo "🧹 SIGMA Bantul - Clear & Seed Database"
echo "========================================"
echo ""

# Warning
echo "⚠️  WARNING: This will delete ALL data in the database!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelled."
    exit 1
fi

echo ""
echo "🗑️  Clearing database..."

# Reset database
npx prisma migrate reset --force

echo ""
echo "✅ Database cleared and seeded!"
echo ""
echo "📊 Summary:"
echo "   - Users: 2 (admin@bantul.go.id / user@bantul.go.id)"
echo "   - Password: password123"
echo "   - Earthquakes: 30"
echo "   - Hazard Zones: 3"
echo "   - Shelters: 5"
echo "   - Roads: 5"
echo "   - Public Facilities: 6"
echo ""
echo "🚀 Next steps:"
echo "   - View data: npm run db:studio"
echo "   - Start server: npm run start:dev"

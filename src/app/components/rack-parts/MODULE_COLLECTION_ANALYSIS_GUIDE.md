# Module Collection Analysis Service

## Overview

The `ModuleCollectionAnalysisService` provides intelligent analysis of user module collections in the context of rack
configurations. It groups modules by standard (3U Eurorack, Intellijel 1U, PulpLogic 1U) and provides context-aware
recommendations.

## Features

- **Multi-Standard Analysis**: Automatically detects and groups modules by format
- **Smart Recommendations**: Provides actionable advice based on actual module collection
- **Utilization Tracking**: Shows how full a rack configuration will be
- **Warning System**: Alerts when modules won't fit in the current configuration
- **Future-Proof**: Easily extensible for new module standards

## Usage Examples

### Basic Rack Analysis

```typescript
import { ModuleCollectionAnalysisService } from 'src/app/components/rack-parts/module-collection-analysis.service';


constructor(private
moduleCollectionAnalysisService: ModuleCollectionAnalysisService
)
{}

analyzeRack()
{
  const analysis = this.moduleCollectionAnalysisService.analyzeRackConfiguration(
    84,  // HP per row
    2,   // Number of rows
    this.userModules // MinimalModule[]
  );
  
  console.log(analysis.recommendation);
  // "Perfect for your 12 3U Eurorack modules (75% full)"
  
  if (analysis.warningMessage) {
    console.warn(analysis.warningMessage);
    // "⚠️ Largest modules won't fit in 84 HP row - Intellijel 1U: 104 HP"
  }
}
```

### Analyze Module Collection Composition

```typescript
analyzeUserModules()
{
  const standardBreakdown = this.rackAnalysisService.analyzeModuleCollection(
    this.userModules
  );
  
  standardBreakdown.forEach(std => {
    console.log(`${ std.standardName }: ${ std.moduleCount } modules, ${ std.totalModulesHp } HP total`);
  });
  // Output:
  // "3U Eurorack: 15 modules, 120 HP total"
  // "Intellijel 1U: 8 modules, 45 HP total"
}
```

### Get Suggested Rack Dimensions

```typescript
getSuggestion()
{
  const suggestion = this.rackAnalysisService.suggestRackDimensions(
    this.userModules
  );
  
  console.log(`Suggested: ${ suggestion.hp } HP × ${ suggestion.rows } rows`);
  // "Suggested: 104 HP × 3 rows"
}
```

### Get Standard Name

```typescript
getModuleType()
{
  const standardName = this.rackAnalysisService.getStandardName(0);
  console.log(standardName); // "3U Eurorack"
}
```

## API Reference

### `analyzeRackConfiguration(hp, rows, modules)`

Analyzes a rack configuration against a user's module collection.

**Parameters:**

- `hp: number` - HP per row
- `rows: number` - Number of rows
- `modules: MinimalModule[]` - User's module collection

**Returns:** `RackAnalysis`

```typescript
interface RackAnalysis {
  totalCapacity: number;           // Total HP capacity
  moduleCount: number;              // Total number of modules
  totalModulesHp: number;           // Sum of all module HP
  utilizationPercent: number;       // How full the rack will be
  recommendation: string;           // Smart recommendation text
  warningMessage?: string;          // Warning if issues detected
  standardAnalyses: StandardAnalysis[]; // Per-standard breakdown
  primaryStandard?: StandardAnalysis;   // Most common standard
}
```

### `analyzeModuleCollection(modules)`

Analyzes module collection composition by standard.

**Parameters:**

- `modules: MinimalModule[]` - Module collection

**Returns:** `StandardAnalysis[]` (sorted by module count, descending)

### `suggestRackDimensions(modules)`

Suggests optimal rack dimensions for a module collection.

**Parameters:**

- `modules: MinimalModule[]` - Module collection

**Returns:** `{ hp: number; rows: number }`

### `getStandardName(standardId)`

Gets human-readable name for a standard ID.

**Parameters:**

- `standardId: number` - Standard ID (0=3U, 1=Intellijel 1U, 2=PulpLogic 1U)

**Returns:** `string`

## Potential Use Cases

1. **Rack Creator Dialog** - Shows real-time analysis as user adjusts dimensions
2. **Rack Browser** - Display utilization stats for existing racks
3. **Module Browser** - Show "Will this fit in my racks?" when viewing modules
4. **User Dashboard** - Display module collection statistics
5. **Shopping List** - Analyze if planned modules will fit in existing racks
6. **Rack Comparison** - Compare different rack configurations side-by-side
7. **Migration Tool** - Help users plan rack upgrades
# Go Interface Lens - Technical Analysis & Issues

## 🚨 **Current Issues Identified**

### 1. **Cache Invalidation Problem**
- **Issue**: When implementation parameters change, CodeLens doesn't remove
- **Root Cause**: Cache isn't properly invalidated on signature changes
- **Impact**: Shows incorrect interface relationships

### 2. **Interface Method Detection Logic Flawed**
- **Issue**: Interface updates show calls/references instead of implementations
- **Root Cause**: `executeImplementationProvider` returns mixed results (implementations + references)
- **Impact**: Incorrect CodeLens on interface methods

### 3. **Mixed Results from VS Code APIs**
- **executeImplementationProvider**: Returns both implementations AND references
- **executeReferenceProvider**: Used as fallback, adds more noise
- **executeDefinitionProvider**: Not reliable for cross-file method detection

## 🔍 **Fundamental Problems**

### Problem 1: Signature Mismatch Detection
```go
// Original interface
interface Writer {
    Write([]byte) (int, error)
}

// Implementation changes from:
func (f FileWriter) Write(data []byte) (int, error) // ✅ Implements
// To:
func (f FileWriter) Write(data []byte) int          // ❌ No longer implements
```

**Current Behavior**: Still shows "Implements: Writer.Write"
**Expected Behavior**: CodeLens should disappear

### Problem 2: Interface Method vs Implementation Confusion
```go
// Interface method
GetJobs(ctx context.Context) ([]Job, error)
```

**Current Behavior**: Shows implementations + references + self
**Expected Behavior**: Only show actual type implementations

## 🧪 **Test Cases Needed**

### Test Case 1: Signature Mismatch
1. Create interface with method signature
2. Create correct implementation 
3. Verify CodeLens appears
4. Change implementation signature to not match
5. Verify CodeLens disappears

### Test Case 2: Interface Method CodeLens
1. Open interface file
2. Verify interface methods show "N implementations"
3. Verify NO reference/call sites are included
4. Only struct type implementations should be counted

### Test Case 3: Cross-File Detection
1. Interface in file A
2. Implementation in file B  
3. Verify CodeLens appears in file B
4. Verify correct interface name shown

### Test Case 4: Cache Invalidation
1. Establish working CodeLens
2. Modify implementation signature
3. Save file
4. Verify CodeLens updates immediately

## 🔧 **Root Cause Analysis**

### Issue 1: `executeImplementationProvider` Behavior
VS Code's implementation provider returns:
- ✅ Actual implementations (good)
- ❌ Reference/call sites (bad)
- ❌ The interface method itself (bad)

### Issue 2: No Signature Validation
Current code assumes if method name matches, it implements interface.
**Missing**: Actual signature comparison (params, return types)

### Issue 3: Cache Strategy Flawed
- Cache keys: File paths only
- **Missing**: Content hash or signature-based cache keys
- **Result**: Stale cache on signature changes

## 🎯 **Fix Strategy**

### Phase 1: Fix Core Detection Logic
1. **Filter `executeImplementationProvider` results**
   - Remove self-references
   - Remove call sites (keep only type implementations)
   - Validate results point to actual struct types

2. **Add Signature Validation**
   - Parse method signatures from both interface and implementation
   - Compare parameter types and return types
   - Only show CodeLens for exact matches

### Phase 2: Fix Cache Invalidation
1. **Content-based cache keys**
   - Include file content hash in cache key
   - Invalidate when signature changes detected

2. **Smart cache invalidation**
   - Watch for signature changes specifically
   - Clear related caches (not just current file)

### Phase 3: Add Comprehensive Tests
1. Unit tests for signature parsing
2. Integration tests for CodeLens behavior
3. Edge case tests (partial implementations, etc.)

## 📋 **Implementation Plan**

### Step 1: Create Test Suite ✅
- [ ] Set up test files with known interfaces/implementations
- [ ] Add test cases for all scenarios
- [ ] Establish baseline behavior

### Step 2: Fix Implementation Detection ✅
- [ ] Filter `executeImplementationProvider` results properly
- [ ] Add signature validation logic
- [ ] Remove false positives

### Step 3: Fix Cache Strategy ✅
- [ ] Add content-aware cache invalidation
- [ ] Implement signature change detection
- [ ] Test cache behavior

### Step 4: Validate & Test ✅
- [ ] Run all test cases
- [ ] Verify no regressions
- [ ] Performance testing

## 🚫 **What NOT to Break**

1. **Working same-file detection** (currently works)
2. **Gutter icon functionality** (currently works)
3. **Basic interface → implementation navigation** (currently works)
4. **Cross-file detection when signatures match** (currently works)

## 📊 **Success Criteria**

1. ✅ Changing implementation signature removes CodeLens
2. ✅ Interface methods only show actual implementations
3. ✅ No self-references or call sites in results
4. ✅ Cache invalidates on signature changes
5. ✅ Cross-file detection still works
6. ✅ Performance remains acceptable
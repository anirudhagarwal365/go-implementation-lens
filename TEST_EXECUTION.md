# Test Execution Guide

## 🚀 **Quick Test Execution**

### **Prerequisites:**
1. VS Code with Go extension installed
2. Go Interface Lens extension compiled and loaded
3. Open the workspace: `/Users/anirudhagarwal/work/PersonalLearning/go-codelens`

### **Step 1: Basic Smoke Test**
```bash
# 1. Compile the extension
npm run compile

# 2. Open VS Code in the workspace
code .

# 3. Open test file
code test/test_cases.go
```

### **Step 2: Critical Test Cases (Must Pass)**

#### **🔴 HIGH PRIORITY - User Reported Issues:**

1. **Struct Implementation Detection (TC10.2)**
   - Line 172: `type StructImplExample struct{}`
   - **MUST SHOW:** `Implements: StructInterfaceExample`
   - **IF FAILS:** Core functionality broken

2. **Multiple Interface Struct (TC12.3)**
   - Line 212: `type MultiInterfaceStruct struct{}`  
   - **MUST SHOW:** `Implements: 2 interfaces`
   - **IF FAILS:** Multiple interface detection broken

3. **Cache Invalidation (TC3.1)**
   - Change line 44: `ProcessName(name string)` to `ProcessName(name int)`
   - **MUST:** CodeLens on line 49 should disappear
   - **IF FAILS:** Cache invalidation broken

#### **🟡 MEDIUM PRIORITY - Core Features:**

4. **Interface Implementation Count (TC1.1)**
   - Line 6: `type Writer interface`
   - **SHOULD SHOW:** `2 implementations`

5. **Method Implementation (TC1.3)**
   - Line 13: `func (f FileWriter) Write(...)`
   - **SHOULD SHOW:** `Implements: Writer.Write`

6. **Signature Mismatch (TC2.5)**
   - Line 37: `func (b BrokenImpl) TestMethod(...) int`
   - **SHOULD NOT SHOW:** Any CodeLens (wrong return type)

### **Step 3: Systematic Validation**

Use this checklist to validate each category:

```
[ ] Category 1: Basic Interface Implementation
    [ ] TC1.1: Writer interface shows "2 implementations"
    [ ] TC1.2: FileWriter struct shows "Implements: Writer"  
    [ ] TC1.3: Write method shows "Implements: Writer.Write"
    [ ] TC1.4: Close method shows "Implements: Writer.Close"

[ ] Category 2: Signature Validation  
    [ ] TC2.1: SignatureTest shows "1 implementation"
    [ ] TC2.2: CorrectImpl shows "Implements: SignatureTest"
    [ ] TC2.3: BrokenImpl shows NO CodeLens
    [ ] TC2.4: CorrectImpl.TestMethod shows implementation
    [ ] TC2.5: BrokenImpl.TestMethod shows NO CodeLens

[ ] Category 10: Struct Implementation (CRITICAL)
    [ ] TC10.1: StructInterfaceExample shows "1 implementation"
    [ ] TC10.2: StructImplExample shows "Implements: StructInterfaceExample"
    [ ] TC10.3: DoWork method shows implementation
    [ ] TC10.4: GetStatus method shows implementation

[ ] Category 12: Multiple Interfaces (CRITICAL)  
    [ ] TC12.1: InterfaceA shows "1 implementation"
    [ ] TC12.2: InterfaceB shows "1 implementation"
    [ ] TC12.3: MultiInterfaceStruct shows "Implements: 2 interfaces"
    [ ] TC12.4: MethodA shows "Implements: InterfaceA.MethodA"
    [ ] TC12.5: MethodB shows "Implements: InterfaceB.MethodB"
```

### **Step 4: Performance Test**

1. **Extension Load Time:**
   - Restart VS Code
   - Measure time from startup to CodeLens appearance
   - **Target:** < 2 seconds

2. **Large File Test:**
   - Create file with 50+ interfaces and implementations
   - **Target:** CodeLens appear within 1 second

3. **Cache Performance:**
   - Make small edit to interface
   - **Target:** CodeLens update within 500ms

### **Step 5: Debug Mode Testing**

If any tests fail:

1. **Enable Debug Logging:**
   ```typescript
   // Check logger.getLogPath() output
   // Look for errors in /tmp/go-interface-lens.log
   ```

2. **Check VS Code Developer Console:**
   - `Cmd+Shift+P` → "Developer: Toggle Developer Tools"
   - Look for errors in Console tab

3. **Manual Gopls Testing:**
   ```bash
   # Test if gopls is working
   gopls definition test/test_cases.go:#172:#5
   gopls hover test/test_cases.go:#172:#5
   ```

### **Step 6: Regression Testing**

Before any code changes:
1. **Baseline Test:** Record current results for all test cases
2. **Make Changes:** Implement modifications  
3. **Compare Results:** Ensure no regressions
4. **Document Changes:** Update test results if expected behavior changes

## 🔧 **Debugging Common Issues**

### **Issue: No CodeLens Appearing**
```bash
# Check extension is loaded
# Check gopls is running: ps aux | grep gopls
# Check log file: cat /tmp/go-interface-lens.log
```

### **Issue: Wrong Implementation Count**
```bash
# Check workspace symbols: Cmd+T in VS Code
# Verify gopls can find symbols
# Check for syntax errors in Go files
```

### **Issue: Cache Not Invalidating** 
```bash
# Check document version in logs
# Verify file watcher is working
# Manual cache clear: reload window
```

## 📊 **Test Results Template**

```
## Test Results - [Date]

### Environment:
- VS Code Version: 
- Go Version:
- Extension Version:

### Critical Tests:
- [ ] TC10.2: Struct shows implemented interfaces
- [ ] TC12.3: Multiple interface detection  
- [ ] TC3.1: Cache invalidation works

### Failed Tests:
- TC#: Description of failure
- Expected: [expected result]
- Actual: [actual result]  
- Line: [line number]

### Performance:
- Extension load time: [time]
- CodeLens appearance: [time]
- Cache invalidation: [time]

### Notes:
[Any additional observations]
```

## 🎯 **Success Criteria**

**✅ Release Ready:**
- All critical tests pass (TC10.2, TC12.3, TC3.1)
- 90%+ of all test cases pass
- No performance regressions

**⚠️ Needs Work:**
- Any critical test fails
- <80% test case pass rate  
- Performance issues detected

**🚨 Block Release:**
- Struct implementation detection fails
- Extension doesn't load
- Major functionality broken
package main

// Cross-File Test: Implementation in Different File
// EXPECTED: This struct should show "Implements: CrossFileInterface"
type CrossFileImpl struct {
	name string
}

// EXPECTED: This method should show "Implements: CrossFileInterface.ProcessCrossFile"
func (c CrossFileImpl) ProcessCrossFile(data string) error {
	return nil
}

// EXPECTED: This method should show "Implements: CrossFileInterface.GetCrossFileStatus"  
func (c CrossFileImpl) GetCrossFileStatus() bool {
	return true
}

// Cross-File Test: Implementation with Complex Types
// EXPECTED: This struct should show "Implements: CrossFileComplexInterface"
type CrossFileComplexImpl struct{}

// EXPECTED: This method should show "Implements: CrossFileComplexInterface.ProcessComplex"
func (c CrossFileComplexImpl) ProcessComplex(ctx map[string]interface{}, items []string) (*CrossFileResult, error) {
	return &CrossFileResult{
		Success: true,
		Message: "processed",
		Data:    items,
	}, nil
}

// Cross-File Test: Partial Implementation (Only One Method)
// EXPECTED: This struct should show NO CodeLens (incomplete implementation)
type PartialCrossFileImpl struct{}

func (p PartialCrossFileImpl) ProcessCrossFile(data string) error {
	return nil
}
// Note: Missing GetCrossFileStatus method - should not show as implementing CrossFileInterface
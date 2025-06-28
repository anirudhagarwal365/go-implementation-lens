package main

// Cross-File Test: Interface Definition
// EXPECTED: This interface should show "1 implementation" from cross_file_impl.go
type CrossFileInterface interface {
	ProcessCrossFile(data string) error
	GetCrossFileStatus() bool
}

// Cross-File Test: Another Interface  
// EXPECTED: This should show "0 implementations" (no impl in other file)
type UnimplementedCrossFile interface {
	UnimplementedMethod() string
}

// Cross-File Test: Interface with Complex Types
// EXPECTED: Should work with complex types across files
type CrossFileComplexInterface interface {
	ProcessComplex(ctx map[string]interface{}, items []string) (*CrossFileResult, error)
}

type CrossFileResult struct {
	Success bool
	Message string
	Data    interface{}
}
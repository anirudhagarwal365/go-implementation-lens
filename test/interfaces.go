package main

import "context"

// Test Case 10: Cross-File Interface Definition
// EXPECTED: This interface should show implementations found in implementations.go
type CrossFileInterface interface {
	CrossFileMethod(ctx context.Context, data string) (string, error)
	AnotherMethod(id int) bool
}

// Test Case 11: Interface with Complex Return Types
// EXPECTED: Should properly match complex return types across files
type ComplexReturnInterface interface {
	GetData() (map[string][]byte, error)
	GetChannels() (<-chan string, chan<- int, error)
}

// Test Case 12: Generic-like Interface (using interface{})
// EXPECTED: Should handle interface{} parameters correctly
type GenericInterface interface {
	Store(key string, value interface{}) error
	Retrieve(key string) (interface{}, error)
}

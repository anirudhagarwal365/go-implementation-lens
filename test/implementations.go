package main

import "context"

// Test Case 10: Cross-File Implementation
// EXPECTED: Should show "Implements: CrossFileInterface.CrossFileMethod" and "Implements: CrossFileInterface.AnotherMethod"
type CrossFileImpl struct{}

func (c CrossFileImpl) CrossFileMethod(ctx context.Context, data string) (string, error) {
	return data + "_processed", nil
}

func (c CrossFileImpl) AnotherMethod(id int) bool {
	return id > 0
}

// Test Case 11: Complex Return Types Implementation
// EXPECTED: Should show "Implements: ComplexReturnInterface.*" for both methods
type ComplexReturnImpl struct{}

func (c ComplexReturnImpl) GetData() (map[string][]byte, error) {
	return map[string][]byte{"key": []byte("value")}, nil
}

func (c ComplexReturnImpl) GetChannels() (<-chan string, chan<- int, error) {
	readCh := make(chan string)
	writeCh := make(chan int)
	return readCh, writeCh, nil
}

// Test Case 12: Generic Interface Implementation
// EXPECTED: Should show "Implements: GenericInterface.*" for both methods
type GenericImpl struct{}

func (g GenericImpl) Store(key string, value interface{}) error {
	// Store implementation
	return nil
}

func (g GenericImpl) Retrieve(key string) (interface{}, error) {
	// Retrieve implementation
	return "some_value", nil
}

// Test Case 13: Signature Mismatch Across Files
// EXPECTED: Should NOT show "Implements: CrossFileInterface.*" because signature doesn't match
type BrokenCrossFileImpl struct{}

// Wrong signature: missing context.Context parameter
func (b BrokenCrossFileImpl) CrossFileMethod(data string) (string, error) {
	return data, nil
}

// Wrong signature: wrong return type
func (b BrokenCrossFileImpl) AnotherMethod(id int) string {
	return "not_bool"
}

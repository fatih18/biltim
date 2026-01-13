# 🚀 Bun File Manager

A comprehensive, type-safe file management system built specifically for Bun runtime. Provides advanced file operations including streaming, atomic writes, permission management, and robust error handling.

## ✨ Features

- **🔒 Complete Type Safety** - Full TypeScript support with zero `any` types
- **⚡ Bun Optimized** - Built specifically for Bun's native APIs
- **🔄 Streaming Support** - Memory-efficient operations for large files
- **⚛️ Atomic Operations** - Crash-safe file operations with rollback
- **🛡️ Permission Management** - Cross-platform file permission control
- **📊 Configuration Management** - Flexible, validated configuration system
- **🚦 Singleton Pattern** - Memory-efficient single instance
- **🔧 Utility Functions** - Comprehensive file operation helpers

```typescript
// Create a file
await fileManager.createFile({
  dir: "./data",
  name: "example.txt",
  data: "Hello, Bun!",
});

// Read the file
const content = await fileManager.readFile({
  path: "./data/example.txt",
});

console.log(content); // "Hello, Bun!"
```

## 📚 Complete API Documentation

### 🏗️ Core CRUD Operations

#### **Create Operations**

```typescript
// Basic file creation
await fileManager.createFile({
  dir: "./documents",
  name: "report.txt",
  data: "Annual report content...",
  options: {
    type: "text/plain",
    createDir: true, // Creates directory if it doesn't exist
  },
});

// JSON file creation
await fileManager.createJsonFile("./config", "settings", {
  theme: "dark",
  language: "en",
  autoSave: true,
});

// Directory creation
await fileManager.createDirectory({
  path: "./new-project/src",
  recursive: true,
});
```

#### **Read Operations**

```typescript
// Read as text (default)
const textContent = await fileManager.readFile({
  path: "./document.txt",
});

// Read as JSON
const jsonData = await fileManager.readFile({
  path: "./config.json",
  format: "json",
});

// Read as binary
const binaryData = await fileManager.readFile({
  path: "./image.png",
  format: "buffer",
});

// Read JSON with type safety
interface Config {
  theme: string;
  language: string;
}
const config = await fileManager.readJsonFile<Config>("./config.json");

// Get file information
const fileInfo = await fileManager.getFileInfo("./document.txt");
console.log(`Size: ${fileManager.getFormattedFileSize(fileInfo.size)}`);
console.log(`Modified: ${fileInfo.modifiedAt}`);

// Read directory contents
const files = await fileManager.readDirectory({
  path: "./src",
  recursive: true,
});

// Get files by extension
const jsFiles = await fileManager.getFilesByExtension("./src", ".js");
const tsFiles = await fileManager.getFilesByExtension("./src", "ts"); // Extension dot optional
```

#### **Update Operations**

```typescript
// Overwrite file
await fileManager.updateFile({
  path: "./document.txt",
  data: "New content",
  mode: "overwrite",
});

// Append to file
await fileManager.updateFile({
  path: "./log.txt",
  data: "\\nNew log entry",
  mode: "append",
});

// Update JSON with merge
await fileManager.updateJsonFile(
  "./config.json",
  {
    theme: "light",
    newSetting: "value",
  },
  true
); // merge = true

// Simple append
await fileManager.appendToFile("./log.txt", "\\nAnother entry");
```

#### **Delete Operations**

```typescript
// Delete single file
const deleted = await fileManager.deleteFile("./temp.txt");

// Delete directory
const dirDeleted = await fileManager.deleteDirectory({
  path: "./temp-folder",
  recursive: true,
});

// Bulk delete with results
const result = await fileManager.deleteFiles([
  "./temp1.txt",
  "./temp2.txt",
  "./temp3.txt",
]);
console.log(
  `Deleted: ${result.success.length}, Failed: ${result.failed.length}`
);
```

#### **Utility Operations**

```typescript
// Check if file exists
const exists = await fileManager.exists("./document.txt");

// Copy file
await fileManager.copyFile("./source.txt", "./backup/source.txt");

// Move file
await fileManager.moveFile("./old/location.txt", "./new/location.txt");
```

### 🔄 Streaming Operations

Perfect for large files to avoid memory issues:

```typescript
import { createFileWriter, writeStream, StreamChunk } from "bun-file-manager";

// Create a stream writer
const writer = await fileManager.createStreamWriter("./large-file.txt", {
  highWaterMark: 1024 * 1024, // 1MB buffer
  autoFlush: true,
});

// Write chunks
writer.write("First chunk");
writer.write("Second chunk");
await writer.flush();
await writer.end();

// Bulk streaming write
const chunks: StreamChunk[] = [
  "Chunk 1",
  new Uint8Array([1, 2, 3, 4]),
  "Chunk 3",
];
await fileManager.writeStream("./output.txt", chunks);

// Stream append
await fileManager.appendStream("./log.txt", [
  "\\nLog entry 1",
  "\\nLog entry 2",
]);

// Efficient large file copying
await fileManager.copyFileStream("./huge-file.zip", "./backup/huge-file.zip");

// Process file in chunks
await fileManager.readFileStream("./large-data.txt", async (chunk) => {
  // Process each chunk
  console.log(`Processing ${chunk.length} bytes`);
  // Could process, transform, or send chunk somewhere
});
```

### 🔐 Permission Management

Cross-platform file permission control:

```typescript
import { PERMISSION_MODES } from "bun-file-manager";

// Set permissions using octal
await fileManager.setPermissions("./script.sh", 0o755);

// Use predefined permission patterns
await fileManager.setCommonPermission("./data.txt", "OWNER_READ_WRITE");
await fileManager.setCommonPermission("./script.sh", "EXECUTABLE");

// Available permission modes
console.log(PERMISSION_MODES);
/*
{
  OWNER_READ_WRITE: 0o600,
  OWNER_ALL: 0o700,
  GROUP_READ: 0o640,
  ALL_READ: 0o644,
  ALL_READ_EXECUTE: 0o755,
  ALL_FULL: 0o777,
  READ_ONLY: 0o444,
  EXECUTABLE: 0o755
}
*/

// Get detailed permission info
const permissions = await fileManager.getPermissions("./file.txt");
console.log(permissions);
/*
{
  path: '/full/path/to/file.txt',
  mode: 644,
  owner: { read: true, write: true, execute: false },
  group: { read: true, write: false, execute: false },
  others: { read: true, write: false, execute: false }
}
*/

// Check specific permissions
const canExecute = await fileManager.checkPermissions("./script.sh", 0o100);

// Quick permission changes
await fileManager.makeFileReadable("./document.txt");
await fileManager.makeFileWritable("./config.txt");
await fileManager.makeFileExecutable("./script.sh");
await fileManager.makeFileReadOnly("./important.txt");

// Advanced permission setting
await fileManager.setPermissionsAdvanced({
  path: "./file.txt",
  mode: 0o644,
  recursive: false,
});
```

### ⚛️ Atomic Operations

Crash-safe file operations with automatic rollback:

```typescript
// Basic atomic write
const result = await fileManager.atomicWrite({
  path: "./important-config.json",
  data: JSON.stringify({ setting: "value" }, null, 2),
  backup: true, // Create backup before writing
  sync: true, // Ensure data is synced to disk
});
console.log(`Wrote ${result.bytesWritten} bytes safely`);

// Atomic JSON write
await fileManager.atomicJsonWrite(
  "./config.json",
  {
    database: {
      host: "localhost",
      port: 5432,
      name: "myapp",
    },
    cache: {
      ttl: 3600,
    },
  },
  {
    backup: true,
    tempSuffix: ".writing",
  }
);

// Safe file update with rollback
await fileManager.safeFileUpdate("./user-data.json", async (currentData) => {
  const userData = JSON.parse(currentData);
  userData.lastLogin = new Date().toISOString();
  userData.loginCount = (userData.loginCount || 0) + 1;

  // If this throws an error, file is automatically rolled back
  return JSON.stringify(userData, null, 2);
});

// Batch atomic operations
const operations = [
  {
    path: "./file1.txt",
    data: "Content 1",
    backup: true,
  },
  {
    path: "./file2.txt",
    data: "Content 2",
    backup: true,
  },
];

const batchResult = await fileManager.batchAtomicOperations(operations);
console.log(`Successful: ${batchResult.successful.length}`);
console.log(`Failed: ${batchResult.failed.length}`);

// Manual backup and restore
const backupPath = await fileManager.createFileBackup({
  sourcePath: "./important.txt",
  backupDir: "./backups",
  keepOriginal: true,
  timestamp: true,
});

// Later, if needed, restore from backup
await fileManager.restoreFileFromBackup(backupPath, "./important.txt");
```

### ⚙️ Configuration Management

Flexible configuration with validation:

```typescript
// Get current configuration
const config = fileManager.getConfig();
console.log(config);
/*
{
  defaultEncoding: 'utf-8',
  defaultCreateDir: true,
  defaultRecursive: true,
  maxConcurrency: 5
}
*/

// Update configuration with validation
const validation = fileManager.updateConfig({
  maxConcurrency: 10,
  defaultCreateDir: false,
});

if (validation.isValid) {
  console.log("Configuration updated successfully");
} else {
  console.error("Validation errors:", validation.errors);
  console.warn("Warnings:", validation.warnings);
}

// Validate configuration without applying
const testValidation = fileManager.validateConfiguration({
  maxConcurrency: 100, // This will generate a warning
});

console.log("Errors:", testValidation.errors);
console.log("Warnings:", testValidation.warnings); // ['maxConcurrency > 50 may cause performance issues']
```

### 🔧 Utility Functions

Direct access to utility functions:

```typescript
import {
  formatFileSize,
  validateFileExtension,
  parsePermissions,
  safeJsonParse,
  executeBulkOperation,
} from "bun-file-manager";

// Format file sizes
console.log(formatFileSize(1024)); // "1.00 KB"
console.log(formatFileSize(1048576)); // "1.00 MB"
console.log(formatFileSize(1073741824)); // "1.00 GB"

// Validate file extensions
console.log(validateFileExtension("document.pdf", ".pdf")); // true
console.log(validateFileExtension("image.png", "jpg")); // false

// Parse permission modes
const perms = parsePermissions(0o755);
console.log(perms);
/*
{
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  others: { read: true, write: false, execute: true }
}
*/

// Safe JSON operations
const parsed = safeJsonParse('{"valid": "json"}'); // Returns object
const invalid = safeJsonParse("invalid json"); // Returns null

// Bulk operations with concurrency control
const items = ["file1.txt", "file2.txt", "file3.txt"];
const results = await executeBulkOperation(
  items,
  async (filename) => {
    // Process each file
    return await someAsyncOperation(filename);
  },
  3 // Process 3 files concurrently
);
```

## 🏗️ Architecture

The file manager is organized into modular components:

```
bun-file-manager/
├── types.ts        # Type definitions
├── utils.ts        # Utility functions
├── core.ts         # Main singleton class
├── streaming.ts    # Streaming operations
├── permissions.ts  # Permission management
├── atomic.ts       # Atomic operations
└── index.ts        # Main exports
```

### Custom Instance

While the singleton pattern is recommended, you can create custom instances:

```typescript
import { BunFileManager } from "bun-file-manager";

const customManager = BunFileManager.getInstance();
// or use the default instance
import fileManager from "bun-file-manager";
```

## 🛡️ Error Handling

All operations use standardized error handling:

```typescript
import { createFileManagerError } from "bun-file-manager";

try {
  await fileManager.readFile({ path: "./nonexistent.txt" });
} catch (error) {
  if (error.code === "FILE_NOT_FOUND") {
    console.log("File does not exist");
  }
  console.log("Operation:", error.operation);
  console.log("Path:", error.path);
}

// Common error codes:
// - FILE_NOT_FOUND
// - DIRECTORY_CREATE_FAILED
// - PERMISSION_READ_FAILED
// - ATOMIC_WRITE_FAILED
// - SOURCE_NOT_FOUND
// - CONFIG_VALIDATION_FAILED
```

## 🎯 Best Practices

### Memory Efficiency

```typescript
// ✅ For large files, use streaming
await fileManager.writeStream("./large-file.txt", chunks);

// ❌ Avoid loading large files entirely into memory
const hugeFile = await fileManager.readFile({ path: "./huge-file.txt" });
```

### Safety

```typescript
// ✅ Use atomic operations for critical data
await fileManager.atomicJsonWrite("./config.json", data, { backup: true });

// ✅ Always handle errors
try {
  await fileManager.deleteFile("./temp.txt");
} catch (error) {
  console.error("Delete failed:", error.message);
}
```

### Performance

```typescript
// ✅ Use bulk operations for multiple files
const results = await fileManager.deleteFiles(filePaths);

// ✅ Configure concurrency for your use case
fileManager.updateConfig({ maxConcurrency: 10 });
```

## 📊 Type Safety

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  FileCreateOptions,
  FileInfo,
  PermissionInfo,
  AtomicOperationResult,
  StreamWriter,
} from "bun-file-manager";

// All operations are fully typed
const createOptions: FileCreateOptions = {
  dir: "./data",
  name: "example.txt",
  data: "content",
  options: {
    type: "text/plain",
    createDir: true,
  },
};

const info: FileInfo = await fileManager.getFileInfo("./file.txt");
const permissions: PermissionInfo = await fileManager.getPermissions(
  "./file.txt"
);
```

## 🚀 Performance

Built for Bun's performance characteristics:

- **Zero-copy operations** where possible
- **Streaming support** for memory efficiency
- **Concurrent processing** with configurable limits
- **Native Bun APIs** for maximum performance
- **Minimal overhead** singleton pattern

**Built with ❤️ for the Bun ecosystem**

package com.t2.query.controller;

import com.t2.query.service.QueryService;
import com.t2.shared.QueryRequest;
import com.t2.shared.QueryResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/query")
@RequiredArgsConstructor
public class QueryController {

    private final QueryService queryService;

    @PostMapping
    public ResponseEntity<?> query(@RequestBody QueryRequest request) {
        try {
            QueryResult result = queryService.query(request);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Query failed: {}", e.getMessage(), e);
            String msg = e.getMessage() != null ? e.getMessage() : "Query execution failed";
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", msg));
        }
    }
}
